"""dengueradar_predictor.py — production inference for the dengue forecast model."""
import json, pickle
import numpy as np
import pandas as pd
import lightgbm as lgb
import xgboost as xgb
from catboost import CatBoostClassifier, CatBoostRegressor


class DengueRadarPredictor:
    def __init__(self, model_dir="models"):
        self.lgb = lgb.Booster(model_file=f"{model_dir}/lgb_classifier.txt")
        self.xgb = xgb.XGBClassifier(); self.xgb.load_model(f"{model_dir}/xgb_classifier.json")
        self.cat = CatBoostClassifier(); self.cat.load_model(f"{model_dir}/cat_classifier.cbm")
        with open(f"{model_dir}/meta_classifier.pkl", "rb") as f:
            self.meta = pickle.load(f)

        self.lgb_reg = lgb.Booster(model_file=f"{model_dir}/lgb_regressor.txt")
        self.xgb_reg = xgb.XGBRegressor(); self.xgb_reg.load_model(f"{model_dir}/xgb_regressor.json")
        self.cat_reg = CatBoostRegressor(); self.cat_reg.load_model(f"{model_dir}/cat_regressor.cbm")
        with open(f"{model_dir}/meta_regressor.pkl", "rb") as f:
            self.meta_reg = pickle.load(f)

        with open(f"{model_dir}/pipeline_meta.json") as f:
            self.meta_json = json.load(f)
        self.feature_cols    = self.meta_json["feature_cols"]
        self.int_to_tier     = {int(k): v for k, v in self.meta_json["int_to_tier"].items()}
        self.alert_threshold = self.meta_json.get("alert_decision_threshold", 0.5)

    def _stack_tier(self, X):
        return np.hstack([self.lgb.predict(X),
                          self.xgb.predict_proba(X),
                          self.cat.predict_proba(X)])

    def _stack_cases(self, X):
        return np.column_stack([self.lgb_reg.predict(X),
                                self.xgb_reg.predict(X),
                                self.cat_reg.predict(X)])

    def predict(self, df):
        X = df[self.feature_cols].fillna(0)
        probs = self.meta.predict_proba(self._stack_tier(X))
        return probs.argmax(axis=1), probs

    def predict_cases(self, df):
        X = df[self.feature_cols].fillna(0)
        return np.expm1(self.meta_reg.predict(self._stack_cases(X))).clip(0)

    def predict_week(self, week_start, frame):
        rows = frame[frame["week_start"] == pd.Timestamp(week_start)]
        if rows.empty:
            return pd.DataFrame()
        pred, probs = self.predict(rows)
        cases = self.predict_cases(rows)
        out = rows[["moh_name", "district"]].copy().reset_index(drop=True)
        out["predicted_tier"]        = [self.int_to_tier[p] for p in pred]
        out["predicted_cases"]       = np.round(cases).astype(int)
        out[["p_Low","p_Watch","p_Warning","p_Alert"]] = probs
        out["alert_high_confidence"] = out["p_Alert"] > self.alert_threshold
        out["action_priority"]       = (out["p_Alert"] * np.log1p(out["predicted_cases"])).round(3)
        out["target_week_start"]     = pd.Timestamp(week_start) + pd.Timedelta(days=7)
        return out.sort_values("p_Alert", ascending=False).reset_index(drop=True)
