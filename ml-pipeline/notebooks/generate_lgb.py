import pandas as pd
import numpy as np
import lightgbm as lgb
import os

print("Loading data...")
try:
    df_raw = pd.read_csv("../data/raw/dengueradar_training_table.csv")
except Exception as e:
    print("Could not load data:", e)
    exit(1)

df = df_raw.copy()
df["week_start"] = pd.to_datetime(df["week_start"])
df = df.sort_values(["moh_name", "week_start"]).reset_index(drop=True)

for col in ["cases_lag1", "cases_lag2"]:
    df[col] = df.groupby("moh_name")[col].transform(lambda s: s.bfill())

train_mask = df["week_start"] < "2024-01-01"
val_mask   = (df["week_start"] >= "2024-01-01") & (df["week_start"] < "2025-01-01")
test_mask  = df["week_start"] >= "2025-01-01"

thresholds = df.loc[train_mask, "incidence_per_100k"].quantile([0.50, 0.80, 0.95]).values
T1, T2, T3 = thresholds

def to_tier(inc):
    if inc < T1: return 0
    if inc < T2: return 1
    if inc < T3: return 2
    return 3
df["risk_tier_int"] = df["incidence_per_100k"].apply(to_tier).astype(int)

# --- Feature Engineering (Copied exactly from notebook cell 8) ---
g = df.groupby("moh_name")["cases"]
for lag in [1, 2, 3, 4, 5, 8, 12, 26, 52]:
    df[f"cases_lag{lag}"] = g.shift(lag)

_shifted = df.groupby("moh_name")["cases"].shift(1)
for window in [4, 8, 12]:
    df[f"cases_roll{window}_mean"] = _shifted.groupby(df["moh_name"]).rolling(window, min_periods=1).mean().reset_index(level=0, drop=True)
    df[f"cases_roll{window}_max"]  = _shifted.groupby(df["moh_name"]).rolling(window, min_periods=1).max().reset_index(level=0, drop=True)
    df[f"cases_roll{window}_std"]  = _shifted.groupby(df["moh_name"]).rolling(window, min_periods=1).std().reset_index(level=0, drop=True)

df["case_growth_wow"] = ((g.shift(1).values - g.shift(2).values) / (g.shift(2).values + 1.0)).clip(-5, 5)
df["case_accel"] = df.groupby("moh_name")["case_growth_wow"].diff()

def _rolling_slope(s, window=8):
    def slope(arr):
        if len(arr) < 2 or np.std(arr) < 1e-6: return 0.0
        return float(np.polyfit(np.arange(len(arr)), arr, 1)[0])
    return s.rolling(window, min_periods=2).apply(slope, raw=True)
df["case_trend_8w"] = _shifted.groupby(df["moh_name"]).transform(lambda s: _rolling_slope(s, 8))

for lag in [1, 2, 4, 8]:
    df[f"inc_lag{lag}"] = df.groupby("moh_name")["incidence_per_100k"].shift(lag)
inc_shifted = df.groupby("moh_name")["incidence_per_100k"].shift(1)
for window in [4, 12]:
    df[f"inc_roll{window}_mean"] = inc_shifted.groupby(df["moh_name"]).rolling(window, min_periods=1).mean().reset_index(level=0, drop=True)

df["month"] = df["week_start"].dt.month
df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
df["woy"] = df["week_start"].dt.isocalendar().week.astype(int)
df["woy_sin"] = np.sin(2 * np.pi * df["woy"] / 52)
df["woy_cos"] = np.cos(2 * np.pi * df["woy"] / 52)
df["iso_year"] = df["week_start"].dt.isocalendar().year.astype(int)

district_week = (df.groupby(["district","week_start"])
                 .agg(district_total=("cases","sum"), district_mean=("cases","mean"), district_max=("cases","max"))
                 .reset_index().sort_values(["district","week_start"]))
for lag in [1, 2, 4]:
    district_week[f"district_total_lag{lag}"] = district_week.groupby("district")["district_total"].shift(lag)
    district_week[f"district_mean_lag{lag}"]  = district_week.groupby("district")["district_mean"].shift(lag)
    district_week[f"district_max_lag{lag}"]   = district_week.groupby("district")["district_max"].shift(lag)
shifted_total = district_week.groupby("district")["district_total"].shift(1)
district_week["district_total_roll4"]  = shifted_total.groupby(district_week["district"]).rolling(4, min_periods=1).mean().reset_index(level=0, drop=True)
district_week["district_total_roll12"] = shifted_total.groupby(district_week["district"]).rolling(12, min_periods=1).mean().reset_index(level=0, drop=True)
df = df.merge(
    district_week[["district","week_start",
                   "district_total_lag1","district_total_lag2","district_total_lag4",
                   "district_mean_lag1","district_max_lag1",
                   "district_total_roll4","district_total_roll12"]],
    on=["district","week_start"], how="left")

prev_cases = df.groupby("moh_name")["cases"].shift(1)
df["_p"] = prev_cases
df["district_rank_lag1"] = df.groupby(["district","week_start"])["_p"].rank(pct=True)
df["district_zscore_lag1"] = ((df["_p"] - df.groupby(["district","week_start"])["_p"].transform("mean")) /
                              (df.groupby(["district","week_start"])["_p"].transform("std") + 1e-3))
df = df.drop(columns=["_p"])

df["temp_range"]   = df["temp_max"] - df["temp_min"]
df["rain_change"]  = df["rain_1w"] - df["rain_2w"] / 2.0
df["heat_index"]   = df["temp_avg"] * df["humidity"] / 100.0
df["rain_x_temp"]  = df["rain_1w"] * df["temp_avg"]
df["rain_x_humid"] = df["rain_1w"] * df["humidity"]
df["log_pop"]      = np.log1p(df["population"])
df["log_density"]  = np.log1p(df["pop_density"])

def _wst(s, threshold=20):
    c, out = 999, []
    for v in s:
        if v > threshold: c = 0
        else: c += 1
        out.append(min(c, 52))
    return pd.Series(out, index=s.index)
df["_lc"] = df.groupby("moh_name")["cases"].shift(1)
df["weeks_since_outbreak_lag1"] = df.groupby("moh_name")["_lc"].transform(_wst)
df = df.drop(columns=["_lc"])

all_districts = sorted(df["district"].unique())
district_to_idx = {d: i for i, d in enumerate(all_districts)}
df["district_cat"] = df["district"].map(district_to_idx).astype("int32")

lag_cols = [c for c in df.columns if "lag" in c or "_roll" in c or c in ["case_trend_8w","case_growth_wow","case_accel"]]
df[lag_cols] = df.groupby("moh_name")[lag_cols].transform(lambda s: s.ffill().bfill()).fillna(0)
df["weeks_since_outbreak_lag1"] = df["weeks_since_outbreak_lag1"].fillna(52)

DROP_COLS = ["moh_code","moh_name","ds_name","ds_id","district","week_start","iso_week",
             "cases","incidence_per_100k","risk_tier","risk_tier_int",
             "centroid_lat","centroid_lon","birth_rate","area_km2"]
FEATURE_COLS = [c for c in df.columns if c not in DROP_COLS]

# --- Train LGBM ---
train = df[df["week_start"] < "2024-01-01"].copy()
val   = df[(df["week_start"] >= "2024-01-01") & (df["week_start"] < "2025-01-01")].copy()

X_train = train[FEATURE_COLS].fillna(0); y_train = train["risk_tier_int"].values
X_val   = val[FEATURE_COLS].fillna(0);   y_val   = val["risk_tier_int"].values

import collections
counts = collections.Counter(y_train)
total = len(y_train)
class_weights = {cls: total / (4 * count) for cls, count in counts.items()}
sample_weight = np.array([class_weights[y] for y in y_train])

train_data = lgb.Dataset(X_train, label=y_train, weight=sample_weight)
val_data   = lgb.Dataset(X_val,   label=y_val, reference=train_data)

params = {
    "objective": "multiclass",
    "num_class": 4,
    "metric": "multi_logloss",
    "learning_rate": 0.05,
    "num_leaves": 31,
    "max_depth": 6,
    "feature_fraction": 0.8,
    "verbose": -1,
    "seed": 42
}

print("Training LightGBM...")
lgb_model = lgb.train(
    params,
    train_data,
    num_boost_round=1000,
    valid_sets=[train_data, val_data],
    callbacks=[lgb.early_stopping(stopping_rounds=50, verbose=False)]
)

model_path = "../src/models/lgb_classifier.txt"
lgb_model.save_model(model_path)
print(f"Saved LightGBM model to {model_path}")

