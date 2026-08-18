"""app.py — FastAPI service that serves the 1-week-ahead dengue forecast.

Run:
    pip install fastapi uvicorn[standard] pydantic lightgbm xgboost catboost pandas numpy
    uvicorn app:app --host 0.0.0.0 --port 8000

The model artifacts in ./models/ are loaded once at startup. The /predict/next-week endpoint
expects a list of rows that already have all 63 feature columns. If your pipeline computes the
features upstream, just POST the result here.
"""
from typing import List, Optional
from datetime import date

import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from dengueradar_predictor import DengueRadarPredictor

app = FastAPI(title="DengueRadar Forecast API", version="1.0.0")
predictor: Optional[DengueRadarPredictor] = None


class FeatureRow(BaseModel):
    """One row of input features for a (MOH, current week) pair.

    Must include all 63 feature columns. See pipeline_meta.json for the full list.
    District must be passed as district_cat (int) — encode it on your side using the
    district_to_idx map in pipeline_meta.json.
    """
    moh_name: str
    district: str
    week_start: date
    # the 63 numeric features are accepted as a free-form dict so the schema is forward-compatible
    features: dict = Field(default_factory=dict)


class PredictRequest(BaseModel):
    feature_week_start: date
    rows: List[FeatureRow]


class Prediction(BaseModel):
    moh_name: str
    district: str
    predicted_tier: str
    predicted_cases: int
    p_Low: float
    p_Watch: float
    p_Warning: float
    p_Alert: float
    alert_high_confidence: bool
    action_priority: float


class PredictResponse(BaseModel):
    feature_week_start: date
    target_week_start: date
    n_predictions: int
    predictions: List[Prediction]


@app.on_event("startup")
def _load():
    global predictor
    predictor = DengueRadarPredictor("models")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict/next-week", response_model=PredictResponse)
def predict_next_week(req: PredictRequest):
    if not req.rows:
        raise HTTPException(status_code=400, detail="rows is empty")
    if predictor is None:
        raise HTTPException(status_code=503, detail="model not loaded")

    # Build a DataFrame with one row per (MOH, week_start). All 63 features must be present
    # in the `features` dict of each row.
    feature_cols = predictor.feature_cols
    records = []
    for r in req.rows:
        row = {"moh_name": r.moh_name, "district": r.district, "week_start": pd.Timestamp(r.week_start)}
        for col in feature_cols:
            row[col] = r.features.get(col, 0.0)
        records.append(row)
    df = pd.DataFrame(records)

    out = predictor.predict_week(req.feature_week_start, df)
    if out.empty:
        raise HTTPException(status_code=404, detail="no rows match the requested feature_week_start")

    target_week = (pd.Timestamp(req.feature_week_start) + pd.Timedelta(days=7)).date()
    preds = [
        Prediction(
            moh_name=str(r["moh_name"]),
            district=str(r["district"]),
            predicted_tier=str(r["predicted_tier"]),
            predicted_cases=int(r["predicted_cases"]),
            p_Low=float(r["p_Low"]),
            p_Watch=float(r["p_Watch"]),
            p_Warning=float(r["p_Warning"]),
            p_Alert=float(r["p_Alert"]),
            alert_high_confidence=bool(r["alert_high_confidence"]),
            action_priority=float(r["action_priority"]),
        )
        for _, r in out.iterrows()
    ]
    return PredictResponse(
        feature_week_start=req.feature_week_start,
        target_week_start=target_week,
        n_predictions=len(preds),
        predictions=preds,
    )
