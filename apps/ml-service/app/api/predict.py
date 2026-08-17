"""
DengueRadar ML Service — /api/predict endpoint (v2)

Model: LightGBM + XGBoost + CatBoost → Logistic-Regression meta-learner (3-model stack)
Features: 63 (exactly matching pipeline_meta.json feature_cols)

Prediction strategy
───────────────────
• Week 1 — direct inference from the caller's provided lags / stats.
• Week 2 — the caller re-submits with lag1 = week-1 predicted value (SE-style
           propagation).  This endpoint always executes a SINGLE inference;
           iterative propagation lives in the backend prediction service.
"""

import os
import json
import math
import pickle
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

from app.schemas.predict import (
    PredictRequest, PredictResponse, MohInput, MohPrediction
)

router = APIRouter()

# ── Paths ────────────────────────────────────────────────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
META_JSON_PATH  = os.path.join(MODEL_DIR, "pipeline_meta.json")
META_3_PKL_PATH = os.path.join(MODEL_DIR, "meta_3model.pkl")
LGB_PATH        = os.path.join(MODEL_DIR, "lgb_classifier.txt")
XGB_PATH        = os.path.join(MODEL_DIR, "xgb_classifier.json")
CAT_PATH        = os.path.join(MODEL_DIR, "cat_classifier.cbm")

# ── Load pipeline metadata ───────────────────────────────────────────────────
try:
    with open(META_JSON_PATH) as f:
        PIPELINE_META = json.load(f)
    FEATURE_COLS    = PIPELINE_META["feature_cols"]          # list of 63 names
    INT_TO_TIER     = {int(k): v for k, v in PIPELINE_META["int_to_tier"].items()}
    TIER_TO_INT     = {v: int(k) for k, v in PIPELINE_META["int_to_tier"].items()}
    TIER_THRESHOLDS = PIPELINE_META["tier_thresholds"]       # [T1, T2, T3] incidence
    ALERT_THRESHOLD = PIPELINE_META.get("alert_decision_threshold", 0.5)
    DISTRICT_TO_IDX = PIPELINE_META["district_to_idx"]
    print(f"✅ pipeline_meta.json loaded — {len(FEATURE_COLS)} features")
except Exception as e:
    print(f"❌ Failed to load pipeline_meta.json: {e}")
    PIPELINE_META = None

# ── Load base models ─────────────────────────────────────────────────────────
lgb_model = None
xgb_clf   = None
cat_clf   = None
meta_clf  = None

try:
    import lightgbm as lgb
    lgb_model = lgb.Booster(model_file=LGB_PATH)
    print("✅ LightGBM model loaded")
except Exception as e:
    print(f"❌ LightGBM load error: {e}")

try:
    import xgboost as xgb
    xgb_clf = xgb.XGBClassifier()
    xgb_clf.load_model(XGB_PATH)
    print("✅ XGBoost model loaded")
except Exception as e:
    print(f"❌ XGBoost load error: {e}")

try:
    from catboost import CatBoostClassifier
    cat_clf = CatBoostClassifier()
    cat_clf.load_model(CAT_PATH)
    print("✅ CatBoost model loaded")
except Exception as e:
    print(f"❌ CatBoost load error: {e}")

try:
    with open(META_3_PKL_PATH, "rb") as f:
        meta_clf = pickle.load(f)
    print("✅ Meta learner (3-model) loaded")
except Exception as e:
    print(f"❌ Meta learner load error: {e}")


# ── Helpers ──────────────────────────────────────────────────────────────────

def _models_ready() -> bool:
    return all(m is not None for m in [lgb_model, xgb_clf, cat_clf, meta_clf, PIPELINE_META])


def _tier_to_risk_level(tier: str) -> str:
    """Map 4-tier model output → 3-tier legacy frontend level."""
    mapping = {
        "Low":     "low",
        "Watch":   "moderate",
        "Warning": "high",
        "Alert":   "high",
    }
    return mapping.get(tier, "low")


def _risk_score_from_probs(probs: np.ndarray) -> float:
    """
    Convert probability vector [p_Low, p_Watch, p_Warning, p_Alert]
    to a 0-100 risk score.
    """
    weights = np.array([0.0, 33.0, 66.0, 100.0])
    return float(np.dot(probs, weights))


def _predicted_cases_from_tier(tier: str, population: float = 100_000) -> int:
    """
    Return a realistic case estimate for the predicted tier.
    Uses tier midpoints (incidence per 100k) scaled to the actual MOH zone population.

    Tier boundaries from pipeline_meta.json:
       T1 = ~2.75  (Low/Watch boundary)
       T2 = ~7.94  (Watch/Warning boundary)
       T3 = ~23.03 (Warning/Alert boundary)
    """
    # Incidence midpoints per band (cases per 100k people)
    mids = {
        "Low":     TIER_THRESHOLDS[0] / 2,                              # ~1.4
        "Watch":   (TIER_THRESHOLDS[0] + TIER_THRESHOLDS[1]) / 2,      # ~5.3
        "Warning": (TIER_THRESHOLDS[1] + TIER_THRESHOLDS[2]) / 2,      # ~15.5
        "Alert":   TIER_THRESHOLDS[2] * 2,                              # ~46.0
    }
    mid_inc = mids.get(tier, 0.0)  # incidence per 100k
    pop = max(population, 1_000)   # safety floor
    approx_cases = int(round(mid_inc / 100_000 * pop))
    
    # Enforce strict user-defined boundaries based on the ML Model's predicted Status
    risk_level = _tier_to_risk_level(tier)
    if risk_level == "low":
        return max(1, min(4, approx_cases))
    elif risk_level == "moderate":
        return max(5, min(8, approx_cases))
    else: # high
        return max(9, approx_cases)


def _build_feature_row(moh: MohInput) -> dict:
    """
    Build the 63-column feature dict for a single MohInput.

    Feature order in FEATURE_COLS (from pipeline_meta.json):
    ['iso_year','cases_lag1','cases_lag2','temp_avg','temp_max','temp_min',
     'humidity','rain_1w','rain_2w','rain_4w','temp_avg_4w','humidity_4w',
     'population','pop_density','cases_lag3','cases_lag4','cases_lag5',
     'cases_lag8','cases_lag12','cases_lag26','cases_lag52',
     'cases_roll4_mean','cases_roll4_max','cases_roll4_std',
     'cases_roll8_mean','cases_roll8_max','cases_roll8_std',
     'cases_roll12_mean','cases_roll12_max','cases_roll12_std',
     'case_growth_wow','case_accel','case_trend_8w',
     'inc_lag1','inc_lag2','inc_lag4','inc_lag8',
     'inc_roll4_mean','inc_roll12_mean',
     'month','month_sin','month_cos','woy','woy_sin','woy_cos',
     'district_total_lag1','district_total_lag2','district_total_lag4',
     'district_mean_lag1','district_max_lag1',
     'district_total_roll4','district_total_roll12',
     'district_rank_lag1','district_zscore_lag1',
     'temp_range','rain_change','heat_index','rain_x_temp','rain_x_humid',
     'log_pop','log_density','weeks_since_outbreak_lag1','district_cat']
    """
    w = moh.weather
    dt = pd.Timestamp(moh.week_start)

    # ── Case lags ────────────────────────────────────────────────────────────
    lags = list(moh.cases_lags) + [0] * 9
    lag1, lag2, lag3, lag4, lag5, lag8, lag12, lag26, lag52 = (
        lags[0], lags[1], lags[2], lags[3], lags[4],
        lags[5], lags[6], lags[7], lags[8]
    )

    # ── Rolling stats (over lags 1-4, 1-8, 1-12) ────────────────────────────
    roll4_vals  = [lag1, lag2, lag3, lag4]
    roll8_vals  = [lag1, lag2, lag3, lag4, lags[4], lag5, lag8, lags[5]]
    roll12_vals = [lag1, lag2, lag3, lag4, lags[4], lag5, lag8, lags[5],
                   lag12, lags[6], lags[7], lag52]

    roll4_mean  = float(np.mean(roll4_vals))
    roll4_max   = float(np.max(roll4_vals))
    roll4_std   = float(np.std(roll4_vals))

    roll8_mean  = float(np.mean(roll8_vals))
    roll8_max   = float(np.max(roll8_vals))
    roll8_std   = float(np.std(roll8_vals))

    roll12_mean = float(np.mean(roll12_vals))
    roll12_max  = float(np.max(roll12_vals))
    roll12_std  = float(np.std(roll12_vals))

    # ── Growth metrics ───────────────────────────────────────────────────────
    case_growth_wow = float(np.clip((lag1 - lag2) / (lag2 + 1.0), -5, 5))
    wow_prev        = float(np.clip((lag2 - lag3) / (lag3 + 1.0), -5, 5))
    case_accel      = float(case_growth_wow - wow_prev)

    # 8-week linear trend (slope of lags 1..8 reversed so index 0 = oldest)
    trend_series = np.array([lag8, lag5, lag4, lag3, lag2, lag1, lag1, lag1])
    if np.std(trend_series) > 1e-6 and len(trend_series) >= 2:
        case_trend_8w = float(np.polyfit(np.arange(len(trend_series)), trend_series, 1)[0])
    else:
        case_trend_8w = 0.0

    # ── Incidence lags ───────────────────────────────────────────────────────
    ilags = list(moh.incidence_lags) + [0.0] * 4
    inc_lag1, inc_lag2, inc_lag4, inc_lag8 = ilags[0], ilags[1], ilags[2], ilags[3]
    inc_roll4_mean  = float(np.mean([inc_lag1, inc_lag2, inc_lag4, inc_lag8]))
    inc_roll12_mean = inc_roll4_mean   # best approximation without 12 points

    # ── Seasonality ─────────────────────────────────────────────────────────
    month   = dt.month
    woy     = dt.isocalendar()[1]
    iso_year = dt.isocalendar()[0]

    # ── District stats ───────────────────────────────────────────────────────
    ds = list(moh.district_stats) + [0.0] * 9
    (district_total_lag1, district_total_lag2, district_total_lag4,
     district_mean_lag1, district_max_lag1,
     district_total_roll4, district_total_roll12,
     district_rank_lag1, district_zscore_lag1) = ds[:9]

    # ── Weather interactions ─────────────────────────────────────────────────
    temp_range   = w.temp_max - w.temp_min
    rain_change  = w.rain_1w - w.rain_2w / 2.0
    heat_index   = w.temp_avg * w.humidity / 100.0
    rain_x_temp  = w.rain_1w * w.temp_avg
    rain_x_humid = w.rain_1w * w.humidity

    # ── Population ──────────────────────────────────────────────────────────
    log_pop     = float(math.log1p(moh.population))
    log_density = float(math.log1p(moh.pop_density))

    # ── Categorical ─────────────────────────────────────────────────────────
    district_cat = DISTRICT_TO_IDX.get(moh.district, 0)

    # ── Assemble dict in FEATURE_COLS order ─────────────────────────────────
    row = {
        "iso_year":                 float(iso_year),
        "cases_lag1":               lag1,
        "cases_lag2":               lag2,
        "temp_avg":                 w.temp_avg,
        "temp_max":                 w.temp_max,
        "temp_min":                 w.temp_min,
        "humidity":                 w.humidity,
        "rain_1w":                  w.rain_1w,
        "rain_2w":                  w.rain_2w,
        "rain_4w":                  w.rain_4w,
        "temp_avg_4w":              w.temp_avg_4w,
        "humidity_4w":              w.humidity_4w,
        "population":               moh.population,
        "pop_density":              moh.pop_density,
        "cases_lag3":               lag3,
        "cases_lag4":               lag4,
        "cases_lag5":               lag5,
        "cases_lag8":               lag8,
        "cases_lag12":              lag12,
        "cases_lag26":              lag26,
        "cases_lag52":              lag52,
        "cases_roll4_mean":         roll4_mean,
        "cases_roll4_max":          roll4_max,
        "cases_roll4_std":          roll4_std,
        "cases_roll8_mean":         roll8_mean,
        "cases_roll8_max":          roll8_max,
        "cases_roll8_std":          roll8_std,
        "cases_roll12_mean":        roll12_mean,
        "cases_roll12_max":         roll12_max,
        "cases_roll12_std":         roll12_std,
        "case_growth_wow":          case_growth_wow,
        "case_accel":               case_accel,
        "case_trend_8w":            case_trend_8w,
        "inc_lag1":                 inc_lag1,
        "inc_lag2":                 inc_lag2,
        "inc_lag4":                 inc_lag4,
        "inc_lag8":                 inc_lag8,
        "inc_roll4_mean":           inc_roll4_mean,
        "inc_roll12_mean":          inc_roll12_mean,
        "month":                    float(month),
        "month_sin":                float(math.sin(2 * math.pi * month / 12)),
        "month_cos":                float(math.cos(2 * math.pi * month / 12)),
        "woy":                      float(woy),
        "woy_sin":                  float(math.sin(2 * math.pi * woy / 52)),
        "woy_cos":                  float(math.cos(2 * math.pi * woy / 52)),
        "district_total_lag1":      district_total_lag1,
        "district_total_lag2":      district_total_lag2,
        "district_total_lag4":      district_total_lag4,
        "district_mean_lag1":       district_mean_lag1,
        "district_max_lag1":        district_max_lag1,
        "district_total_roll4":     district_total_roll4,
        "district_total_roll12":    district_total_roll12,
        "district_rank_lag1":       district_rank_lag1,
        "district_zscore_lag1":     district_zscore_lag1,
        "temp_range":               temp_range,
        "rain_change":              rain_change,
        "heat_index":               heat_index,
        "rain_x_temp":              rain_x_temp,
        "rain_x_humid":             rain_x_humid,
        "log_pop":                  log_pop,
        "log_density":              log_density,
        "weeks_since_outbreak_lag1": moh.weeks_since_outbreak,
        "district_cat":             int(district_cat),   # CatBoost requires int/str, not float
    }
    return row


def _predict_batch(mohs: list) -> list:
    """
    Run the 3-model stacking ensemble on a list of MohInput objects.
    Returns a list of MohPrediction objects (same length, same order).
    """
    rows = [_build_feature_row(m) for m in mohs]
    df   = pd.DataFrame(rows, columns=FEATURE_COLS).fillna(0)

    # CatBoost requires categorical features as integer (not float)
    # district_cat is the only categorical column (last feature, index 62)
    df["district_cat"] = df["district_cat"].astype(int)

    # Categorical feature column indices for CatBoost
    cat_feature_indices = [FEATURE_COLS.index(c) for c in PIPELINE_META.get("categorical_cols", ["district_cat"])]

    # Base model probabilities
    lgb_probs = lgb_model.predict(df)                                           # shape (N, 4)
    xgb_probs = xgb_clf.predict_proba(df)                                       # shape (N, 4)
    cat_probs = cat_clf.predict_proba(df, thread_count=-1)                      # shape (N, 4)

    # Stack → meta learner
    stacked   = np.hstack([lgb_probs, xgb_probs, cat_probs])  # (N, 12)
    meta_probs = meta_clf.predict_proba(stacked)               # (N, 4)

    results = []
    for i, moh in enumerate(mohs):
        probs = meta_probs[i]   # [p_Low, p_Watch, p_Warning, p_Alert]
        tier_idx = int(np.argmax(probs))

        # Apply alert threshold: demote Alert → Warning if p_alert < threshold
        if tier_idx == 3 and probs[3] < ALERT_THRESHOLD:
            tier_idx = 2

        tier = INT_TO_TIER[tier_idx]
        predicted_cases = _predicted_cases_from_tier(tier, moh.population)

        results.append(MohPrediction(
            moh_name=moh.moh_name,
            district=moh.district,
            week_start=moh.week_start,
            predicted_tier=tier,
            p_low=float(probs[0]),
            p_watch=float(probs[1]),
            p_warning=float(probs[2]),
            p_alert=float(probs[3]),
            alert_high_confidence=bool(probs[3] > ALERT_THRESHOLD),
            predicted_cases=predicted_cases,
            risk_level=_tier_to_risk_level(tier),
            risk_score=_risk_score_from_probs(probs),
        ))
    return results


# ── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest):
    """
    Single-call inference endpoint.

    Accepts a list of MohInput items (one per MOH zone).
    Returns tier prediction + probabilities for each.

    The backend prediction service calls this endpoint TWICE:
      1. With current-week lags → Week-1 prediction.
      2. With propagated lags (Week-1 predicted cases injected as lag1) → Week-2 prediction.
    This keeps the ML service stateless while enabling SE-style 2-week forecasting.
    """
    if not _models_ready():
        raise HTTPException(
            status_code=503,
            detail="One or more models are not loaded. Check server logs."
        )

    if not payload.mohs:
        raise HTTPException(status_code=400, detail="mohs list must not be empty.")

    predictions = []
    BATCH = 200  # process in chunks to limit memory usage

    for start in range(0, len(payload.mohs), BATCH):
        chunk = payload.mohs[start: start + BATCH]
        try:
            predictions.extend(_predict_batch(chunk))
        except Exception as ex:
            # Degrade gracefully: return Low tier for failed MOHs
            print(f"[predict] ⚠️ Batch error at offset {start}: {ex}")
            for moh in chunk:
                predictions.append(MohPrediction(
                    moh_name=moh.moh_name,
                    district=moh.district,
                    week_start=moh.week_start,
                    predicted_tier="Low",
                    p_low=1.0, p_watch=0.0, p_warning=0.0, p_alert=0.0,
                    alert_high_confidence=False,
                    predicted_cases=0,
                    risk_level="low",
                    risk_score=0.0,
                ))

    return PredictResponse(predictions=predictions)
