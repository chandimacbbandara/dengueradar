import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.schemas.predict import MohInput, WeatherInputs
from app.api.predict import _predict_batch

weather = WeatherInputs(
    temp_avg=28.5,
    temp_max=32.0,
    temp_min=24.5,
    temp_avg_4w=28.0,
    humidity=82.0,
    humidity_4w=80.0,
    rain_1w=45.0,
    rain_2w=90.0,
    rain_4w=120.0
)

moh = MohInput(
    moh_name="Homagama",
    district="Colombo",
    week_start="2026-08-23",
    cases_lags=[15.0, 12.0, 10.0, 8.0, 5.0, 3.0, 2.0, 1.0, 0.0],
    incidence_lags=[3.0, 2.4, 2.0, 1.6],
    district_stats=[150.0, 120.0, 100.0, 15.0, 50.0, 120.0, 110.0, 0.8, 1.5],
    weeks_since_outbreak=0.0,
    weather=weather,
    population=50000,
    pop_density=500
)

print("Running test prediction...")
try:
    results = _predict_batch([moh])
    pred = results[0]
    print("Prediction succeeded!")
    print(f"Zone: {pred.moh_name}")
    print(f"Predicted Tier: {pred.predicted_tier}")
    print(f"Predicted Cases: {pred.predicted_cases}")
    print(f"Risk Level: {pred.risk_level}")
    print(f"Risk Score: {pred.risk_score}")
    print(f"Probabilities - Low: {pred.p_low:.3f}, Watch: {pred.p_watch:.3f}, Warning: {pred.p_warning:.3f}, Alert: {pred.p_alert:.3f}")
except Exception as e:
    print(f"Prediction failed with error: {e}")
    import traceback
    traceback.print_exc()
