import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


DATA_PATH = "hourly_demand_features.csv"
ARTIFACTS_DIR = Path("artifacts")
ARTIFACTS_DIR.mkdir(exist_ok=True)

FEATURES = [
    "temp", "rhum", "prcp", "wspd", "pres",
    "hour_of_day", "day_of_week", "month",
    "hour_sin", "hour_cos",
    "lag_1", "lag_24", "roll_24_mean"
]
TARGET = "rides_count"


def rmse(y_true, y_pred) -> float:
    return float(np.sqrt(mean_squared_error(y_true, y_pred)))


def main():
    # === Load ===
    df = pd.read_csv(DATA_PATH)

    # Fix time column safely (remove timezone warning)
    df["hour"] = pd.to_datetime(df["hour"], utc=True)
    df["hour"] = df["hour"].dt.tz_convert(None)

    df = df.sort_values("hour").set_index("hour")

    # Drop rows with any missing in required columns
    df = df.dropna(subset=FEATURES + [TARGET])

    X = df[FEATURES]
    y = df[TARGET]

    print("Rows:", len(df), "Features:", X.shape[1])
    print("Time range:", df.index.min(), "->", df.index.max())

    # === Time-based split (no shuffle) ===
    split_idx = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    print("\nTrain range:", X_train.index.min(), "->", X_train.index.max())
    print("Test  range:", X_test.index.min(), "->", X_test.index.max())

    # === Baseline: predict = lag_1 ===
    baseline_pred = X_test["lag_1"].astype(float).values
    baseline_mae = float(mean_absolute_error(y_test, baseline_pred))
    baseline_rmse = rmse(y_test, baseline_pred)
    baseline_r2 = float(r2_score(y_test, baseline_pred))

    print("\n=== BASELINE (lag_1) ===")
    print("MAE :", round(baseline_mae, 4))
    print("RMSE:", round(baseline_rmse, 4))
    print("R2  :", round(baseline_r2, 4))

    # === Model ===
    model = RandomForestRegressor(
        n_estimators=500,
        max_depth=None,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    model_mae = float(mean_absolute_error(y_test, y_pred))
    model_rmse = rmse(y_test, y_pred)
    model_r2 = float(r2_score(y_test, y_pred))

    print("\n=== RANDOM FOREST ===")
    print("MAE :", round(model_mae, 4))
    print("RMSE:", round(model_rmse, 4))
    print("R2  :", round(model_r2, 4))

    # === Quick sanity checks ===
    if model_rmse >= baseline_rmse:
        print("\n[WARN] Model is not better than baseline! Consider tuning/features.")
    else:
        print("\n[OK] Model beats baseline.")

    # === Save artifacts ===
    joblib.dump(model, ARTIFACTS_DIR / "rf_model.joblib")

    schema = {
        "features": FEATURES,
        "target": TARGET,
        "time_col": "hour",
        "tz_normalization": "parsed as utc then tz removed"
    }
    (ARTIFACTS_DIR / "feature_schema.json").write_text(json.dumps(schema, indent=2), encoding="utf-8")

    metadata = {
        "model_type": "RandomForestRegressor",
        "n_estimators": 500,
        "min_samples_leaf": 2,
        "random_state": 42,
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "metrics": {
            "baseline_lag1": {"mae": baseline_mae, "rmse": baseline_rmse, "r2": baseline_r2},
            "random_forest": {"mae": model_mae, "rmse": model_rmse, "r2": model_r2},
        },
        "train_time_range": [str(X_train.index.min()), str(X_train.index.max())],
        "test_time_range": [str(X_test.index.min()), str(X_test.index.max())],
    }
    (ARTIFACTS_DIR / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    print("\nSaved:")
    print(" - artifacts/rf_model.joblib")
    print(" - artifacts/feature_schema.json")
    print(" - artifacts/metadata.json")

    # Feature importance (helpful for report)
    importances = pd.Series(model.feature_importances_, index=FEATURES).sort_values(ascending=False)
    print("\nTop-10 feature importances:")
    print(importances.head(10).to_string())


if __name__ == "__main__":
    main()
