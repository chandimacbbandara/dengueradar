import os
import json
import numpy as np
import xgboost as xgb
from fastapi import APIRouter, HTTPException
from app.schemas.predict import PredictRequest, PredictResponse, DistrictPrediction

router = APIRouter()

# Load models and mappings
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

# District label encoding map matching exactly the categorical indices in Pandas training
DISTRICT_MAP = {
    "Ampara": 0, "Anuradhapura": 1, "Badulla": 2, "Batticaloa": 3, "Colombo": 4,
    "Galle": 5, "Gampaha": 6, "Hambantota": 7, "Jaffna": 8, "Kalutara": 9,
    "Kandy": 10, "Kegalle": 11, "Kilinochchi": 12, "Kurunegala": 13, "Mannar": 14,
    "Matale": 15, "Matara": 16, "Moneragala": 17, "Monaragala": 17, "Mullaitivu": 18,
    "Nuwara Eliya": 19, "Polonnaruwa": 20, "Puttalam": 21, "Ratnapura": 22,
    "Trincomalee": 23, "Vavuniya": 24
}

# Risk level names matching TIER_TO_INT values: 0->Low, 1->Watch, 2->Warning, 3->Alert
RISK_LEVELS = ["Low", "Watch", "Warning", "Alert"]

try:
    xgb_clf = xgb.XGBClassifier()
    xgb_clf.load_model(os.path.join(MODEL_DIR, "xgb_classifier.json"))

    xgb_reg = xgb.XGBRegressor()
    xgb_reg.load_model(os.path.join(MODEL_DIR, "xgb_regressor.json"))
    print("🤖 XGBoost models loaded successfully")
except Exception as e:
    print(f"❌ Error loading models: {e}")
    xgb_clf = None
    xgb_reg = None

def get_monsoon_flags(month: int):
    # SW Monsoon: May to September
    # NE Monsoon: December to February
    # Inter: March-April, October-November
    is_sw = 1.0 if 5 <= month <= 9 else 0.0
    is_ne = 1.0 if month in [12, 1, 2] else 0.0
    is_inter = 1.0 if month in [3, 4, 10, 11] else 0.0
    return is_sw, is_ne, is_inter

@router.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest):
    if not xgb_clf or not xgb_reg:
        raise HTTPException(status_code=500, detail="Models not loaded on server.")

    results = []
    for dist_data in payload.districts:
        try:
            # 1. Parse date context
            dt = np.datetime64(dist_data.week_start)
            month = int(str(dt).split("-")[1])
            
            # Cyclic month features
            month_sin = np.sin(2 * np.pi * month / 12.0)
            month_cos = np.cos(2 * np.pi * month / 12.0)
            is_sw, is_ne, is_inter = get_monsoon_flags(month)

            # 2. Extract cases history (lags)
            # cases_history must correspond to: [lag1, lag2, lag3, lag4, lag8, lag12]
            h = dist_data.cases_history
            while len(h) < 6:
                h.append(0)  # pad if missing
            lag1, lag2, lag3, lag4, lag8, lag12 = h[0], h[1], h[2], h[3], h[4], h[5]

            # 3. Form rolls & growth
            roll4 = [lag1, lag2, lag3, lag4]
            roll4_mean = float(np.mean(roll4))
            roll4_max  = float(np.max(roll4))
            roll4_std  = float(np.std(roll4))
            
            # roll 12 mean includes lag12
            roll12_mean = float(np.mean(h + [0]*(12-len(h))))
            
            case_growth = float(lag1 - lag2)
            case_accel = float((lag1 - lag2) - (lag2 - lag3))

            # Weather
            w = dist_data.weather
            temp_range = w.temp_max - w.temp_min
            rain_intensity = w.rain_1w / 4.0

            # Static
            log_pop = np.log1p(dist_data.population)
            log_density = np.log1p(dist_data.pop_density)
            district_le = DISTRICT_MAP.get(dist_data.district, 4)  # fallback to Colombo

            # 4. Form Feature Array matching exact order in feature_list.json
            features = [
                lag1, lag2, lag3, lag4, lag8, lag12,
                roll4_mean, roll4_max, roll4_std, roll12_mean,
                case_growth, case_accel,
                month_sin, month_cos, is_sw, is_ne, is_inter,
                w.temp_avg, w.temp_max, w.temp_min, temp_range, w.temp_avg, # temp_avg_4w fallback to temp_avg
                w.humidity, w.humidity, # humidity_4w fallback to humidity
                w.rain_1w, w.rain_2w, w.rain_4w, rain_intensity,
                log_pop, log_density, dist_data.birth_rate, dist_data.area_km2,
                dist_data.centroid_lat, dist_data.centroid_lon,
                district_le
            ]

            # Shape for XGBoost
            x = np.array([features], dtype=np.float32)

            # 5. Predict Regression (Cases) -> inverse of log1p
            pred_cases_log = xgb_reg.predict(x)[0]
            pred_cases = int(np.expm1(pred_cases_log))
            if pred_cases < 0:
                pred_cases = 0

            # 6. Predict Classifier (Risk Tier)
            # objective: multi:softprob -> outputs probability array
            probs = xgb_clf.predict_proba(x)[0]
            pred_tier_int = int(np.argmax(probs))
            risk_level = RISK_LEVELS[pred_tier_int]
            
            # Risk score calculation matching 0-100 range scale based on probability weight
            # low:0, watch:1, warning:2, alert:3
            risk_score = float(np.sum(probs * np.array([10.0, 40.0, 75.0, 100.0])))

            results.append(DistrictPrediction(
                district=dist_data.district,
                predicted_cases=pred_cases,
                risk_level=risk_level,
                risk_score=risk_score
            ))
        except Exception as ex:
            print(f"Error predicting for district {dist_data.district}: {ex}")
            results.append(DistrictPrediction(
                district=dist_data.district,
                predicted_cases=0,
                risk_level="Low",
                risk_score=0.0
            ))

    return PredictResponse(predictions=results)
