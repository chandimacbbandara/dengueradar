from pydantic import BaseModel
from typing import List, Optional

class WeatherInputs(BaseModel):
    temp_avg: float
    temp_max: float
    temp_min: float
    humidity: float
    rain_1w: float
    rain_2w: float
    rain_4w: float

class DistrictHistoricalData(BaseModel):
    district: str
    week_start: str  # YYYY-MM-DD
    # Historical cases for lag calculations
    cases_history: List[int]  # [cases_w_1, cases_w_2, cases_w_3, cases_w_4, cases_w_8, cases_w_12]
    # Weather factors
    weather: WeatherInputs
    # Geo/static inputs
    population: float
    pop_density: float
    birth_rate: float
    area_km2: float
    centroid_lat: float
    centroid_lon: float

class PredictRequest(BaseModel):
    districts: List[DistrictHistoricalData]

class DistrictPrediction(BaseModel):
    district: str
    predicted_cases: int
    risk_level: str  # Low, Watch, Warning, Alert
    risk_score: float

class PredictResponse(BaseModel):
    predictions: List[DistrictPrediction]
