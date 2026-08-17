import subprocess, sys, os, json, pickle
import warnings
warnings.filterwarnings("ignore")

IN_COLAB = False
try:
    from google.colab import files
    IN_COLAB = True
except ImportError:
    pass

for pkg in ["lightgbm", "catboost", "xgboost", "shap", "pyarrow"]:
    try:
        __import__(pkg)
    except ImportError:
        print(f"Installing {pkg}...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", pkg])
        except subprocess.CalledProcessError:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "--break-system-packages", pkg])

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
import random

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED); random.seed(RANDOM_SEED)
sns.set_theme(style="whitegrid", palette="viridis")
plt.rcParams["figure.figsize"] = (11, 5)
plt.rcParams["axes.titleweight"] = "bold"

MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)

TIER_ORDER = ["Low", "Watch", "Warning", "Alert"]
TIER_TO_INT = {t: i for i, t in enumerate(TIER_ORDER)}
INT_TO_TIER = {i: t for t, i in TIER_TO_INT.items()}

def tier_mae(y_true, y_pred):
    return float(np.mean(np.abs(np.asarray(y_true) - np.asarray(y_pred))))

from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix
from sklearn.utils.class_weight import compute_sample_weight, compute_class_weight
from sklearn.linear_model import LogisticRegression

print(f"Setup complete. Colab: {IN_COLAB}, Python: {sys.version.split()[0]}")


if IN_COLAB:
    print("Choose dengueradar_training_table.csv from your computer...")
    uploaded = files.upload()
    DATA_PATH = list(uploaded.keys())[0]
else:

    candidates = [
        "dengueradar_training_table.csv",
        "../dengueradar_training_table.csv",
        "/workspace/dengueradar_training_table.csv",
        "/content/dengueradar_training_table.csv",
    ]
    DATA_PATH = next((p for p in candidates if os.path.exists(p)), None)
    if DATA_PATH is None:
        raise FileNotFoundError(
            "Place dengueradar_training_table.csv in the current directory or update DATA_PATH."
        )
    print(f"Found data at: {DATA_PATH}")

df_raw = pd.read_csv(DATA_PATH)
print(f"Loaded: {df_raw.shape[0]:,} rows, {df_raw.shape[1]} columns")
print(f"Date range: {pd.to_datetime(df_raw['week_start']).min().date()} -> {pd.to_datetime(df_raw['week_start']).max().date()}")
print(f"MOH areas: {df_raw['moh_name'].nunique()}  |  Districts: {df_raw['district'].nunique()}")


df = df_raw.copy()
df["week_start"] = pd.to_datetime(df["week_start"])
df = df.sort_values(["moh_name", "week_start"]).reset_index(drop=True)

for col in ["cases_lag1", "cases_lag2"]:
    df[col] = df.groupby("moh_name")[col].transform(lambda s: s.bfill())

print("Risk tier distribution (original):")
print(df["risk_tier"].value_counts().reindex(TIER_ORDER))
print()

fig, axes = plt.subplots(1, 2, figsize=(13, 4))
counts = df["risk_tier"].value_counts().reindex(TIER_ORDER)
axes[0].bar(counts.index, counts.values, color=["#3a7d44","#f9a03f","#e63946","#9d0208"])
axes[0].set_title("Risk tier counts"); axes[0].set_ylabel("count")
for i, v in enumerate(counts.values): axes[0].text(i, v, f"{v:,}", ha="center", va="bottom")
pct = counts / counts.sum() * 100
axes[1].pie(pct, labels=[f"{t}\n{p:.1f}%" for t, p in zip(TIER_ORDER, pct)],
            colors=["#3a7d44","#f9a03f","#e63946","#9d0208"], startangle=90)
axes[1].set_title("Risk tier proportion")
plt.tight_layout(); plt.show()

print("Class imbalance (Low:Alert):", round(counts["Low"] / counts["Alert"], 1), ": 1")
print("This is why we need class weights later - the model would just predict Low for everything otherwise.")


train_mask = df["week_start"] < "2024-01-01"
val_mask   = (df["week_start"] >= "2024-01-01") & (df["week_start"] < "2025-01-01")
test_mask  = df["week_start"] >= "2025-01-01"

thresholds = df.loc[train_mask, "incidence_per_100k"].quantile([0.50, 0.80, 0.95]).values
T1, T2, T3 = thresholds
print(f"Tier thresholds (from training data 2014-2023):")
print(f"  Low:      incidence < {T1:.2f}")
print(f"  Watch:    {T1:.2f} <= incidence < {T2:.2f}")
print(f"  Warning:  {T2:.2f} <= incidence < {T3:.2f}")
print(f"  Alert:    incidence >= {T3:.2f}")

def to_tier(inc):
    if inc < T1: return 0
    if inc < T2: return 1
    if inc < T3: return 2
    return 3
df["risk_tier_int"] = df["incidence_per_100k"].apply(to_tier).astype(int)

train = df[train_mask].copy()
val   = df[val_mask].copy()
test  = df[test_mask].copy()
for name, part in [("Train 2014-2023", train), ("Val 2024", val), ("Test 2025-2026", test)]:
    mix = pd.Series(part["risk_tier_int"]).map(INT_TO_TIER).value_counts().reindex(TIER_ORDER).to_dict()
    print(f"  {name}: {len(part):>7,} rows, tier mix = {mix}")


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
print(f"Built {len(FEATURE_COLS)} features")


train = df[df["week_start"] < "2024-01-01"].copy()
val   = df[(df["week_start"] >= "2024-01-01") & (df["week_start"] < "2025-01-01")].copy()
test  = df[df["week_start"] >= "2025-01-01"].copy()
print(f"Re-split: train={train.shape}, val={val.shape}, test={test.shape}")

import lightgbm as lgb
X_train = train[FEATURE_COLS].fillna(0); y_train = train["risk_tier_int"].values
X_val   = val[FEATURE_COLS].fillna(0);   y_val   = val["risk_tier_int"].values
X_test  = test[FEATURE_COLS].fillna(0);  y_test  = test["risk_tier_int"].values
sw = compute_sample_weight("balanced", y_train)
print(f"Train: {X_train.shape}  Val: {X_val.shape}  Test: {X_test.shape}")

lgb_params = {
    "objective":"multiclass","num_class":4,"metric":"multi_logloss",
    "learning_rate":0.05,"num_leaves":63,"min_child_samples":30,
    "feature_fraction":0.8,"bagging_fraction":0.8,"bagging_freq":5,
    "reg_alpha":0.1,"reg_lambda":0.5,"n_jobs":-1,"verbose":-1,"seed":RANDOM_SEED,
}
print("Training LightGBM...")
dtrain = lgb.Dataset(X_train, y_train, weight=sw, categorical_feature=["district_cat"])
dval   = lgb.Dataset(X_val, y_val, reference=dtrain, categorical_feature=["district_cat"])
lgb_model = lgb.train(lgb_params, dtrain, num_boost_round=2000, valid_sets=[dval], valid_names=["val"],
                      callbacks=[lgb.early_stopping(80), lgb.log_evaluation(0)])
lgb_pred = lgb_model.predict(X_test).argmax(axis=1)
lgb_acc = accuracy_score(y_test, lgb_pred)
print(f"LightGBM test acc: {lgb_acc:.4f}  (best iter: {lgb_model.best_iteration})")


import xgboost as xgb
print("Training XGBoost...")
xgb_clf = xgb.XGBClassifier(
    n_estimators=2000, max_depth=6, learning_rate=0.05,
    subsample=0.8, colsample_bytree=0.8, reg_alpha=0.1, reg_lambda=0.5, min_child_weight=5,
    objective="multi:softprob", num_class=4, random_state=RANDOM_SEED, n_jobs=-1,
    eval_metric="mlogloss", early_stopping_rounds=80, tree_method="hist",
)
xgb_clf.fit(X_train, y_train, sample_weight=sw, eval_set=[(X_val, y_val)], verbose=0)
xgb_pred = xgb_clf.predict(X_test)
xgb_acc = accuracy_score(y_test, xgb_pred)
print(f"XGBoost test acc: {xgb_acc:.4f}  (best iter: {xgb_clf.best_iteration})")


from catboost import CatBoostClassifier
print("Training CatBoost (this takes a few minutes)...")
cat_clf = CatBoostClassifier(
    iterations=2000, depth=7, learning_rate=0.05,
    loss_function="MultiClass", eval_metric="MultiClass",
    random_seed=RANDOM_SEED, verbose=0, early_stopping_rounds=80, l2_leaf_reg=3.0,
    cat_features=["district_cat"], task_type="CPU",
)
cat_clf.fit(X_train, y_train, sample_weight=sw, eval_set=(X_val, y_val), use_best_model=True)
cat_pred = cat_clf.predict(X_test).astype(int).ravel()
cat_acc = accuracy_score(y_test, cat_pred)
print(f"CatBoost test acc: {cat_acc:.4f}")


import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

SEQ_LEN = 12
SEQ_FEATURES = ["cases","incidence_per_100k","district_total_lag1",
                "temp_avg","rain_1w","humidity","log_pop"]

# Build sequences
def build_sequences(frame, moh_list):
    X, y, d, m = [], [], [], []
    feat = frame[SEQ_FEATURES].values.astype(np.float32)
    for moh in moh_list:
        idx = sorted(frame.index[frame["moh_name"]==moh].tolist(),
                     key=lambda i: frame.at[i,"week_start"])
        vals = feat[idx]; tiers = frame.iloc[idx]["risk_tier_int"].values
        ds = frame.iloc[idx]["week_start"].values
        for i in range(SEQ_LEN, len(idx)):
            X.append(vals[i-SEQ_LEN:i]); y.append(tiers[i]); d.append(ds[i]); m.append(moh)
    return np.array(X), np.array(y), np.array(d), np.array(m)

print("Building LSTM sequences (12-week windows)...")
X_seq, y_seq, d_seq, m_seq = build_sequences(df, df["moh_name"].unique())
tr_m = d_seq < np.datetime64("2024-01-01")
va_m = (d_seq >= np.datetime64("2024-01-01")) & (d_seq < np.datetime64("2025-01-01"))
te_m = d_seq >= np.datetime64("2025-01-01")
Xtr, ytr = X_seq[tr_m], y_seq[tr_m]
Xva, yva = X_seq[va_m], y_seq[va_m]
Xte, yte = X_seq[te_m], y_seq[te_m]
mu = Xtr.reshape(-1, len(SEQ_FEATURES)).mean(axis=0)
sd = Xtr.reshape(-1, len(SEQ_FEATURES)).std(axis=0) + 1e-6
Xtr = (Xtr-mu)/sd; Xva = (Xva-mu)/sd; Xte = (Xte-mu)/sd

tf.random.set_seed(RANDOM_SEED)
lstm_model = keras.Sequential([
    layers.Input(shape=(SEQ_LEN, len(SEQ_FEATURES))),
    layers.LSTM(64, return_sequences=True), layers.Dropout(0.3),
    layers.LSTM(32), layers.Dropout(0.3),
    layers.Dense(32, activation="relu"), layers.Dropout(0.2),
    layers.Dense(4, activation="softmax"),
])
lstm_model.compile(optimizer=keras.optimizers.Adam(1e-3), loss="sparse_categorical_crossentropy", metrics=["accuracy"])
cw = compute_class_weight("balanced", classes=np.arange(4), y=ytr)
print("Training LSTM...")
lstm_model.fit(Xtr, ytr, validation_data=(Xva, yva), epochs=30, batch_size=256,
               class_weight=dict(enumerate(cw)),
               callbacks=[keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=5, restore_best_weights=True)],
               verbose=0)
lstm_probs = lstm_model.predict(Xte, verbose=0)
lstm_pred = lstm_probs.argmax(axis=1)
lstm_acc = accuracy_score(yte, lstm_pred)
print(f"LSTM test acc: {lstm_acc:.4f}  (test set is LSTM-eligible subset: {len(yte)} rows)")


# 3-model stack: LightGBM + XGBoost + CatBoost (12 features) - this is the PRODUCTION model
# 4-model stack: + LSTM (16 features) - for evaluation only, since LSTM is slower at inference

val_p3  = np.hstack([lgb_model.predict(X_val),  xgb_clf.predict_proba(X_val),  cat_clf.predict_proba(X_val)])
test_p3 = np.hstack([lgb_model.predict(X_test), xgb_clf.predict_proba(X_test), cat_clf.predict_proba(X_test)])

def make_aligned_df(frame, X, lgb_m, xgb_m, cat_m, lstm_pred=None, m_arr=None, d_arr=None, mask=None):
    keys = frame[["moh_name", "week_start"]].reset_index(drop=True)
    out = keys.copy()
    lgb_p = lgb_m.predict(X)
    for i in range(4): out[f"p{i}"] = lgb_p[:, i]
    xgb_p = xgb_m.predict_proba(X)
    for i in range(4): out[f"px{i}"] = xgb_p[:, i]
    cat_p = cat_m.predict_proba(X)
    for i in range(4): out[f"py{i}"] = cat_p[:, i]
    if lstm_pred is not None and m_arr is not None and d_arr is not None and mask is not None:
        lstm_df = pd.DataFrame({"moh_name": m_arr[mask], "week_start": d_arr[mask]})
        for i in range(4): lstm_df[f"pz{i}"] = lstm_pred[:, i]
        out = out.merge(lstm_df, on=["moh_name", "week_start"], how="inner")
    return out.merge(frame.reset_index(drop=True)[["moh_name", "week_start", "risk_tier_int"]],
                     on=["moh_name", "week_start"], how="inner")

val_aligned  = make_aligned_df(val,  X_val,  lgb_model, xgb_clf, cat_clf, lstm_model.predict(Xva, verbose=0), m_seq, d_seq, va_m)
test_aligned = make_aligned_df(test, X_test, lgb_model, xgb_clf, cat_clf, lstm_probs,                       m_seq, d_seq, te_m)

def to_4stack(df):
    return np.hstack([
        df[[f"p{i}"  for i in range(4)]].values,
        df[[f"px{i}" for i in range(4)]].values,
        df[[f"py{i}" for i in range(4)]].values,
        df[[f"pz{i}" for i in range(4)]].values,
    ])

val_p4  = to_4stack(val_aligned)
test_p4 = to_4stack(test_aligned)
y_val_4  = val_aligned["risk_tier_int"].values
y_test_4 = test_aligned["risk_tier_int"].values
print(f"3-model: val {val_p3.shape}, test {test_p3.shape}")
print(f"4-model: val {val_p4.shape}, test {test_p4.shape}  (LSTM-eligible only)")


meta_3 = LogisticRegression(max_iter=2000, C=1.0, n_jobs=-1, random_state=RANDOM_SEED,
                            class_weight="balanced", solver="lbfgs")
meta_3.fit(val_p3, y_val)
ens_3 = meta_3.predict(test_p3)
ens_3_acc = accuracy_score(y_test, ens_3)
print(f"\n3-model ensemble (PRODUCTION): {ens_3_acc:.4f}  on {len(y_test)} test rows")

meta_4 = LogisticRegression(max_iter=2000, C=1.0, n_jobs=-1, random_state=RANDOM_SEED,
                            class_weight="balanced", solver="lbfgs")
meta_4.fit(val_p4, y_val_4)
ens_4 = meta_4.predict(test_p4)
ens_4_acc = accuracy_score(y_test_4, ens_4)
print(f"4-model ensemble (eval only):  {ens_4_acc:.4f}  on {len(y_test_4)} LSTM-eligible rows")
print(f"3-model is the one we ship to production.")

results = pd.DataFrame([
    ("Stacking Ensemble (3-model, prod)", ens_3_acc),
    ("CatBoost",          cat_acc),
    ("LightGBM",          lgb_acc),
    ("XGBoost",           xgb_acc),
    ("LSTM",              lstm_acc),
    ("Naive persistence (baseline)",  accuracy_score(y_test, df.groupby("moh_name")["risk_tier_int"].shift(1).loc[test.index].fillna(0).astype(int).values)),
], columns=["model","accuracy"]).sort_values("accuracy", ascending=False)

print(results.to_string(index=False))

print("\nProduction ensemble (3-model) per-class breakdown:")
print(classification_report(y_test, ens_3, target_names=TIER_ORDER, digits=4))

print("Saving deployment artifacts...")

lgb_model.save_model(f"{MODEL_DIR}/lgb_classifier.txt")
xgb_clf.save_model(f"{MODEL_DIR}/xgb_classifier.json")
cat_clf.save_model(f"{MODEL_DIR}/cat_classifier.cbm")
lstm_model.save(f"{MODEL_DIR}/lstm_model.keras")

with open(f"{MODEL_DIR}/meta_3model.pkl", "wb") as f: pickle.dump(meta_3, f)
with open(f"{MODEL_DIR}/meta_4model.pkl", "wb") as f: pickle.dump(meta_4, f)

lstm_stats = {"mean": mu.tolist(), "std": sd.tolist(), "seq_features": SEQ_FEATURES, "seq_len": SEQ_LEN}
with open(f"{MODEL_DIR}/lstm_norm_stats.pkl", "wb") as f: pickle.dump(lstm_stats, f)

meta_json = {
    "feature_cols": FEATURE_COLS,
    "categorical_cols": ["district_cat"],
    "tier_to_int": TIER_TO_INT,
    "int_to_tier": {str(k): v for k, v in INT_TO_TIER.items()},
    "tier_thresholds": [float(T1), float(T2), float(T3)],
    "alert_decision_threshold": 0.5,
    "seq_features": SEQ_FEATURES,
    "seq_len": SEQ_LEN,
    "random_seed": RANDOM_SEED,
    "district_to_idx": district_to_idx,
}
with open(f"{MODEL_DIR}/pipeline_meta.json", "w") as f: json.dump(meta_json, f, indent=2)

print(f"\nSaved to {MODEL_DIR}/:")
for f in sorted(os.listdir(MODEL_DIR)):
    size = os.path.getsize(f"{MODEL_DIR}/{f}") / 1024
    print(f"  {f:30s}  {size:>8.1f} KB")

if IN_COLAB:
    print("\nTo download all artifacts in Colab:")
    print("  from google.colab import files")
    print("  !zip -r models.zip models/")
    print("  files.download('models.zip')")


class DengueRadarPredictor:
    def __init__(self, model_dir="models"):
        import lightgbm as lgb, xgboost as xgb
        from catboost import CatBoostClassifier
        self.lgb = lgb.Booster(model_file=f"{model_dir}/lgb_classifier.txt")
        self.xgb = xgb.XGBClassifier(); self.xgb.load_model(f"{model_dir}/xgb_classifier.json")
        self.cat = CatBoostClassifier(); self.cat.load_model(f"{model_dir}/cat_classifier.cbm")
        with open(f"{model_dir}/meta_3model.pkl","rb") as f: self.meta = pickle.load(f)
        with open(f"{model_dir}/pipeline_meta.json") as f: self.meta_json = json.load(f)
        self.feature_cols = self.meta_json["feature_cols"]
        self.int_to_tier = {int(k): v for k, v in self.meta_json["int_to_tier"].items()}
        self.alert_threshold = self.meta_json.get("alert_decision_threshold", 0.5)
        print(f"Loaded predictor from '{model_dir}' ({len(self.feature_cols)} features)")

    def predict(self, df):
        X = df[self.feature_cols].fillna(0)
        p = np.hstack([self.lgb.predict(X), self.xgb.predict_proba(X), self.cat.predict_proba(X)])
        probs = self.meta.predict_proba(p)
        return probs.argmax(axis=1), probs

    def predict_with_threshold(self, df):

        pred, probs = self.predict(df)
        pred = pred.copy()
        pred[(pred == 3) & (probs[:, 3] < self.alert_threshold)] = 2
        return pred, probs

    def predict_week(self, week_start, frame):
        rows = frame[frame["week_start"] == pd.Timestamp(week_start)]
        if rows.empty: return pd.DataFrame()
        pred, probs = self.predict(rows)
        out = rows[["moh_name","district"]].copy().reset_index(drop=True)
        out["predicted_tier"] = [self.int_to_tier[p] for p in pred]
        out[["p_Low","p_Watch","p_Warning","p_Alert"]] = probs
        out["alert_high_confidence"] = out["p_Alert"] > self.alert_threshold
        return out.sort_values("p_Alert", ascending=False)

predictor_code = '''
import json, pickle, numpy as np, pandas as pd
import lightgbm as lgb, xgboost as xgb
from catboost import CatBoostClassifier

class DengueRadarPredictor:
    def __init__(self, model_dir="models"):
        self.lgb = lgb.Booster(model_file=f"{model_dir}/lgb_classifier.txt")
        self.xgb = xgb.XGBClassifier(); self.xgb.load_model(f"{model_dir}/xgb_classifier.json")
        self.cat = CatBoostClassifier(); self.cat.load_model(f"{model_dir}/cat_classifier.cbm")
        with open(f"{model_dir}/meta_3model.pkl","rb") as f: self.meta = pickle.load(f)
        with open(f"{model_dir}/pipeline_meta.json") as f: self.meta_json = json.load(f)
        self.feature_cols = self.meta_json["feature_cols"]
        self.int_to_tier = {int(k): v for k, v in self.meta_json["int_to_tier"].items()}
        self.alert_threshold = self.meta_json.get("alert_decision_threshold", 0.5)

    def predict(self, df):
        X = df[self.feature_cols].fillna(0)
        p = np.hstack([self.lgb.predict(X), self.xgb.predict_proba(X), self.cat.predict_proba(X)])
        probs = self.meta.predict_proba(p)
        return probs.argmax(axis=1), probs

    def predict_with_threshold(self, df):
        pred, probs = self.predict(df)
        pred = pred.copy()
        pred[(pred == 3) & (probs[:, 3] < self.alert_threshold)] = 2
        return pred, probs

    def predict_week(self, week_start, frame):
        rows = frame[frame["week_start"] == pd.Timestamp(week_start)]
        if rows.empty: return pd.DataFrame()
        pred, probs = self.predict(rows)
        out = rows[["moh_name","district"]].copy().reset_index(drop=True)
        out["predicted_tier"] = [self.int_to_tier[p] for p in pred]
        out[["p_Low","p_Watch","p_Warning","p_Alert"]] = probs
        out["alert_high_confidence"] = out["p_Alert"] > self.alert_threshold
        return out.sort_values("p_Alert", ascending=False)
'''
with open("dengueradar_predictor.py", "w") as f:
    f.write(predictor_code)
print("Wrote dengueradar_predictor.py - drop this in your deployment repo.")


predictor = DengueRadarPredictor(MODEL_DIR)

example = test.iloc[[10]]
pred, probs = predictor.predict(example)
print(f"\n=== Single prediction ===")
print(f"MOH: {example['moh_name'].iloc[0]}  Week: {example['week_start'].iloc[0].date()}")
print(f"True tier:      {INT_TO_TIER[example['risk_tier_int'].iloc[0]]}")
print(f"Predicted tier: {INT_TO_TIER[pred[0]]}")
print("Probabilities:")
for i, t in enumerate(TIER_ORDER):
    print(f"  {t:8s}: {probs[0, i]:.3f}")

print(f"\n=== Predict for week of 2025-06-07 ===")
weekly = predictor.predict_week("2025-06-07", df)
print(f"Predictions for {len(weekly)} MOHs")
print(f"Tier breakdown: {weekly['predicted_tier'].value_counts().to_dict()}")
print(f"\nTop 10 highest-Alert-confidence MOHs:")
print(weekly.head(10)[["moh_name","district","predicted_tier","p_Alert"]].to_string(index=False))


