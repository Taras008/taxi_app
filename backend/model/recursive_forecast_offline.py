import json
from pathlib import Path
from datetime import timedelta

import joblib
import numpy as np
import pandas as pd


DATA_PATH = "hourly_demand_features.csv"
MODEL_PATH = "artifacts/rf_model.joblib"
SCHEMA_PATH = "artifacts/feature_schema.json"
OUT_PATH = "artifacts/forecast_preview.csv"


def load_history():
    df = pd.read_csv(DATA_PATH)

    # привести час стабільно
    df["hour"] = pd.to_datetime(df["hour"], utc=True).dt.tz_convert(None)
    df = df.sort_values("hour").set_index("hour")

    return df


def get_features_list():
    schema = json.loads(Path(SCHEMA_PATH).read_text(encoding="utf-8"))
    return schema["features"]


def cyclical_hour_features(ts: pd.Timestamp):
    hour = ts.hour
    return {
        "hour_of_day": hour,
        "hour_sin": float(np.sin(2 * np.pi * hour / 24)),
        "hour_cos": float(np.cos(2 * np.pi * hour / 24)),
    }


def calendar_features(ts: pd.Timestamp):
    return {
        **cyclical_hour_features(ts),
        "day_of_week": ts.weekday(),
        "month": ts.month,
    }


def weather_stub_from_last_known(history: pd.DataFrame):
    """
    Поки що заглушка: беремо погоду як в останню відому годину.
    Далі замінимо на реальний weather API, який дає погоду для кожної години майбутнього.
    """
    last = history.iloc[-1]
    return {
        "temp": float(last["temp"]),
        "rhum": float(last["rhum"]),
        "prcp": float(last["prcp"]),
        "wspd": float(last["wspd"]),
        "pres": float(last["pres"]),
    }


def build_row_for_timestamp(ts: pd.Timestamp, history: pd.DataFrame):
    """
    Формує рівно ті фічі, які очікує модель, включно з лагами.
    history MUST містити колонку rides_count з реальними/прогнозними значеннями до ts-1h.
    """
    if len(history) < 24:
        raise ValueError("Not enough history to compute lag_24 / roll_24_mean (need >= 24 rows).")

    y_series = history["rides_count"].astype(float)

    lag_1 = float(y_series.iloc[-1])
    lag_24 = float(y_series.iloc[-24])
    roll_24_mean = float(y_series.iloc[-24:].mean())

    row = {
        **calendar_features(ts),
        **weather_stub_from_last_known(history),
        "lag_1": lag_1,
        "lag_24": lag_24,
        "roll_24_mean": roll_24_mean,
    }
    return row


def recursive_forecast(start_datetime: str, horizon_hours: int):
    model = joblib.load(MODEL_PATH)
    features = get_features_list()
    df = load_history()

    start_ts = pd.Timestamp(start_datetime)
    if start_ts.tzinfo is not None:
        start_ts = start_ts.tz_convert(None)

    if start_ts not in df.index:
        raise ValueError(
            "start_datetime must exist in historical data index (for MVP). "
            "Choose a timestamp within dataset range."
        )

    # history до старту включно (реальні значення)
    history = df.loc[:start_ts, ["rides_count", "temp", "rhum", "prcp", "wspd", "pres"]].copy()

    # sanity: має бути принаймні 24 години
    if len(history) < 24:
        raise ValueError("Not enough history before start_datetime (need at least 24 hours).")

    preds = []
    current_ts = start_ts

    for step in range(1, horizon_hours + 1):
        ts = current_ts + timedelta(hours=1)

        row = build_row_for_timestamp(ts, history)
        X = pd.DataFrame([row])[features]
        y_hat = float(model.predict(X)[0])

        # захист від дивних значень
        if y_hat < 0:
            y_hat = 0.0

        preds.append({"datetime": ts, "prediction": y_hat})

        # апдейтимо history: додаємо нову годину з прогнозом + (поки що) ті ж погодні значення
        new_weather = weather_stub_from_last_known(history)
        history.loc[ts] = {"rides_count": y_hat, **new_weather}

        current_ts = ts

    out = pd.DataFrame(preds).set_index("datetime")
    return out


def sanity_checks(forecast: pd.DataFrame):
    assert len(forecast) > 0
    assert forecast["prediction"].isna().sum() == 0, "NaNs in predictions!"
    assert (forecast["prediction"] >= 0).all(), "Negative predictions found!"
    print("\nSanity checks: OK")
    print("Min/Mean/Max:", forecast["prediction"].min(), forecast["prediction"].mean(), forecast["prediction"].max())


if __name__ == "__main__":
    # приклад: стартуємо з останньої години в датасеті і прогнозуємо 24 години
    df_hist = load_history()
    last_ts = df_hist.index.max()

    fc = recursive_forecast(start_datetime=str(last_ts), horizon_hours=24)
    sanity_checks(fc)

    Path("artifacts").mkdir(exist_ok=True)
    fc.to_csv(OUT_PATH)
    print(f"\nSaved forecast preview to: {OUT_PATH}")
    print(fc.head(10))
