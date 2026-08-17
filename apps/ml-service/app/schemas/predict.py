"""
DengueRadar ML Service — Pydantic schemas (v2)

Matches the 63-feature stacking ensemble model trained in the notebook.
Each MohInput provides all raw inputs needed to compute the 63 features
server-side before calling LightGBM + XGBoost + CatBoost + meta-learner.
"""

from pydantic import BaseModel
from typing import List, Optional


class WeatherInputs(BaseModel):
    """Current-week and rolling weather statistics."""
    temp_avg: float          # current week average temperature (°C)
    temp_max: float          # current week max temperature (°C)
    temp_min: float          # current week min temperature (°C)
    temp_avg_4w: float       # 4-week rolling average temperature (°C)
    humidity: float          # current week relative humidity (%)
    humidity_4w: float       # 4-week rolling average humidity (%)
    rain_1w: float           # rainfall last 1 week (mm)
    rain_2w: float           # rainfall last 2 weeks (mm)
    rain_4w: float           # rainfall last 4 weeks (mm)


class MohInput(BaseModel):
    """
    All raw inputs for one (MOH zone, week) row.

    cases_lags: list of 9 previous weekly case counts in order:
        [lag1, lag2, lag3, lag4, lag5, lag8, lag12, lag26, lag52]
        where lag1 = last week, lag52 = same week last year.
        Missing / unknown lags should be 0.

    incidence_lags: incidence per 100k corresponding to the same lag positions
        [lag1, lag2, lag4, lag8]  (only 4 needed)

    district_stats: district-level aggregated stats at lag1 / lag2 / lag4:
        [district_total_lag1, district_total_lag2, district_total_lag4,
         district_mean_lag1, district_max_lag1,
         district_total_roll4, district_total_roll12,
         district_rank_lag1, district_zscore_lag1]
        All 0.0 if unknown.

    weeks_since_outbreak: weeks since last week had >20 cases in this MOH (capped 52).
    """
    moh_name: str            # e.g. "Agalawatta"
    district: str            # e.g. "Kalutara"
    week_start: str          # ISO date YYYY-MM-DD (Monday of the target week)

    # Case lags — 9 values: lag1..lag5, lag8, lag12, lag26, lag52
    cases_lags: List[float]        # length 9; pad with 0s if missing

    # Incidence lags — 4 values: lag1, lag2, lag4, lag8
    incidence_lags: List[float]    # length 4; pad with 0s if missing

    # District-level stats — 9 values (see docstring above)
    district_stats: List[float]    # length 9; pad with 0s if missing

    # Weeks since an outbreak (cases > 20) in this MOH zone
    weeks_since_outbreak: float = 52.0

    # Weather data
    weather: WeatherInputs

    # Population / geography (static per MOH zone)
    population: float
    pop_density: float


class PredictRequest(BaseModel):
    mohs: List[MohInput]


# ── Response models ──────────────────────────────────────────────────────────

class MohPrediction(BaseModel):
    moh_name: str
    district: str
    week_start: str           # YYYY-MM-DD (the week this prediction is for)
    predicted_tier: str       # "Low" | "Watch" | "Warning" | "Alert"
    p_low: float
    p_watch: float
    p_warning: float
    p_alert: float
    alert_high_confidence: bool   # True when p_alert > alert_threshold (0.5)
    # Legacy fields kept for backward-compatibility with the backend service
    predicted_cases: int          # rough case estimate derived from tier thresholds
    risk_level: str               # "low" | "moderate" | "high"  (3-tier for frontend)
    risk_score: float             # 0-100 score


class PredictResponse(BaseModel):
    predictions: List[MohPrediction]
