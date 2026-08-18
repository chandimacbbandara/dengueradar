import json

with open('apps/ml-service/app/models/pipeline_meta.json') as f:
    meta = json.load(f)
    meta_cols = set(meta['feature_cols'])

import sys
sys.path.append('apps/ml-service')
from app.api.predict import _build_feature_row
class MockMoh:
    def __init__(self):
        self.weather = type('W', (), {'temp_avg':0, 'temp_max':0, 'temp_min':0, 'humidity':0, 'rain_1w':0, 'rain_2w':0, 'rain_4w':0, 'temp_avg_4w':0, 'humidity_4w':0})()
        self.week_start = '2023-01-01'
        self.cases_lags = [0]*9
        self.incidence_lags = [0]*4
        self.district_stats = [0]*9
        self.population = 1000
        self.pop_density = 100
        self.district = 'Colombo'
        self.weeks_since_outbreak = 0

row = _build_feature_row(MockMoh())
row_cols = set(row.keys())

diff1 = meta_cols - row_cols
diff2 = row_cols - meta_cols
print("Missing in predict.py:", diff1)
print("Extra in predict.py:", diff2)
