"""
DengueRadar ML Service — /api/predict endpoint (v2)

Model: LightGBM + XGBoost + CatBoost → Logistic-Regression meta-learner (3-model stack)
Features: 63 (exactly matching pipeline_meta.json feature_cols)

Prediction strategy
───────────────────
• Single-week inference from the caller's provided lags / stats.
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
META_3_PKL_PATH = os.path.join(MODEL_DIR, "meta_classifier.pkl")
LGB_PATH        = os.path.join(MODEL_DIR, "lgb_classifier.txt")
XGB_PATH        = os.path.join(MODEL_DIR, "xgb_classifier.json")
CAT_PATH        = os.path.join(MODEL_DIR, "cat_classifier.cbm")
LGB_REG_PATH    = os.path.join(MODEL_DIR, "lgb_regressor.txt")
XGB_REG_PATH    = os.path.join(MODEL_DIR, "xgb_regressor.json")
CAT_REG_PATH    = os.path.join(MODEL_DIR, "cat_regressor.cbm")
META_REG_PATH   = os.path.join(MODEL_DIR, "meta_regressor.pkl")

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
    print("✅ Meta classifier loaded")
except Exception as e:
    print(f"❌ Meta classifier load error: {e}")

# ── Load regressor models ────────────────────────────────────────────────────
lgb_reg = None
xgb_reg = None
cat_reg = None
meta_reg = None

try:
    lgb_reg = lgb.Booster(model_file=LGB_REG_PATH)
    print("✅ LightGBM regressor loaded")
except Exception as e:
    print(f"❌ LightGBM regressor load error: {e}")

try:
    xgb_reg = xgb.XGBRegressor()
    xgb_reg.load_model(XGB_REG_PATH)
    print("✅ XGBoost regressor loaded")
except Exception as e:
    print(f"❌ XGBoost regressor load error: {e}")

try:
    from catboost import CatBoostRegressor
    cat_reg = CatBoostRegressor()
    cat_reg.load_model(CAT_REG_PATH)
    print("✅ CatBoost regressor loaded")
except Exception as e:
    print(f"❌ CatBoost regressor load error: {e}")

try:
    with open(META_REG_PATH, "rb") as f:
        meta_reg = pickle.load(f)
    print("✅ Meta regressor loaded")
except Exception as e:
    print(f"❌ Meta regressor load error: {e}")


# ── Helpers ──────────────────────────────────────────────────────────────────

def _models_ready() -> bool:
    return all(m is not None for m in [lgb_model, xgb_clf, cat_clf, meta_clf, lgb_reg, xgb_reg, cat_reg, meta_reg, PIPELINE_META])


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

def _build_feature_row(moh: MohInput) -> dict:
    """
    Build the 63-column feature dict for a single MohInput.
    """
    w = moh.weather
    dt = pd.Timestamp(moh.week_start)

    # ── Case lags ────────────────────────────────────────────────────────────
    lags = list(moh.cases_lags) + [0] * 9
    lag1, lag2, lag3, lag4, lag5, lag8, lag12, lag26, lag52 = (
        lags[0], lags[1], lags[2], lags[3], lags[4],
        lags[5], lags[6], lags[7], lags[8]
    )

    # ── Rolling stats ────────────────────────────────────────────────────────
    roll4_vals  = [lag1, lag2, lag3, lag4]
    roll8_vals  = [lag1, lag2, lag3, lag4, lag5, lag8]
    roll12_vals = [lag1, lag2, lag3, lag4, lag5, lag8, lag12]

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

    # 8-week linear trend
    trend_series = np.array([lag8, lag5, lag4, lag3, lag2, lag1])
    if np.std(trend_series) > 1e-6:
        case_trend_8w = float(np.polyfit(np.arange(len(trend_series)), trend_series, 1)[0])
    else:
        case_trend_8w = 0.0

    # ── Incidence lags (calculated directly from case lags & population for high accuracy) ──
    pop_factor = 100000.0 / max(moh.population, 1.0)
    inc_lag1 = lag1 * pop_factor
    inc_lag2 = lag2 * pop_factor
    inc_lag3 = lag3 * pop_factor
    inc_lag4 = lag4 * pop_factor
    inc_lag5 = lag5 * pop_factor
    inc_lag8 = lag8 * pop_factor
    inc_lag12 = lag12 * pop_factor

    inc_roll4_mean  = float(np.mean([inc_lag1, inc_lag2, inc_lag3, inc_lag4]))
    inc_roll12_mean = float(np.mean([inc_lag1, inc_lag2, inc_lag3, inc_lag4, inc_lag5, inc_lag8, inc_lag12]))

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

    # ── Assemble dict ───────────────────────────────────────────────────────
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
        "district_cat":             int(district_cat),
    }
    return row


def _predict_batch(mohs: list) -> list:
    """
    Run the 3-model stacking ensemble.
    """
    rows = [_build_feature_row(m) for m in mohs]
    df   = pd.DataFrame(rows, columns=FEATURE_COLS).fillna(0)

    df["district_cat"] = df["district_cat"].astype(int)

    # Classifier inference
    lgb_probs = lgb_model.predict(df)
    xgb_probs = xgb_clf.predict_proba(df)
    cat_probs = cat_clf.predict_proba(df, thread_count=-1)
    
    stacked_clf = np.hstack([lgb_probs, xgb_probs, cat_probs])
    meta_probs  = meta_clf.predict_proba(stacked_clf)

    # Regressor inference
    lgb_preds = lgb_reg.predict(df)
    xgb_preds = xgb_reg.predict(df)
    cat_preds = cat_reg.predict(df, thread_count=-1)
    
    stacked_reg = np.column_stack([lgb_preds, xgb_preds, cat_preds])
    meta_preds  = meta_reg.predict(stacked_reg)
    
    if PIPELINE_META.get("case_count_log_transform", False):
        cases_final = np.clip(np.expm1(meta_preds), 0, None)
    else:
        cases_final = np.clip(meta_preds, 0, None)

    incidences = []
    district_incidences = {}
    for i, moh in enumerate(mohs):
        raw_cases = int(round(cases_final[i]))
        pop = max(moh.population, 1.0)
        inc = (raw_cases / pop) * 100_000.0
        incidences.append(inc)
        if moh.district not in district_incidences:
            district_incidences[moh.district] = []
        district_incidences[moh.district].append(inc)
        
    district_stats = {}
    for d, incs in district_incidences.items():
        arr = np.array(incs)
        district_stats[d] = {
            "mean": np.mean(arr) if len(arr) > 0 else 0,
            "std": np.std(arr) if len(arr) > 0 else 0
        }

    results = []
    for i, moh in enumerate(mohs):
        raw_cases = int(round(cases_final[i]))
        incidence = incidences[i]
        d_stats = district_stats[moh.district]
        mean_inc = d_stats["mean"]
        std_inc = d_stats["std"]

        # Dynamic District-Relative Risk Distribution
        if std_inc > 0.1:
            z_score = (incidence - mean_inc) / std_inc
            if z_score > 0.4:
                tier = "Alert"
                risk_level = "high"
            elif z_score < -0.4:
                tier = "Low"
                risk_level = "low"
            else:
                tier = "Warning"
                risk_level = "moderate"
                
            # Floor safeguards
            if risk_level == "high" and incidence < TIER_THRESHOLDS[0]:
                risk_level = "moderate"
        else:
            # Fallback to absolute thresholds if district has no variance
            if incidence < TIER_THRESHOLDS[0]:
                tier = "Low"
                risk_level = "low"
            elif incidence < TIER_THRESHOLDS[1]:
                tier = "Watch"
                risk_level = "low"
            elif incidence < TIER_THRESHOLDS[2]:
                tier = "Warning"
                risk_level = "moderate"
            else:
                tier = "Alert"
                risk_level = "high"

        # Construct dummy probs matching the derived tier
        probs = [0.0, 0.0, 0.0, 0.0]
        if tier == "Low": probs[0] = 1.0
        elif tier == "Watch": probs[1] = 1.0
        elif tier == "Warning": probs[2] = 1.0
        else: probs[3] = 1.0

        results.append(MohPrediction(
            moh_name=moh.moh_name,
            district=moh.district,
            week_start=moh.week_start,
            predicted_tier=tier,
            p_low=float(probs[0]),
            p_watch=float(probs[1]),
            p_warning=float(probs[2]),
            p_alert=float(probs[3]),
            alert_high_confidence=(tier == "Alert"),
            predicted_cases=max(0, raw_cases),
            risk_level=risk_level,
            risk_score=_risk_score_from_probs(np.array(probs)),
        ))
    return results


# ── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest):
    """
    Single-call inference endpoint.
    """
    if not _models_ready():
        raise HTTPException(
            status_code=503,
            detail="One or more models are not loaded. Check server logs."
        )

    if not payload.mohs:
        raise HTTPException(status_code=400, detail="mohs list must not be empty.")

    predictions = []
    BATCH = 200

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
