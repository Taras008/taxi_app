import math
from datetime import datetime
from typing import Dict, List, Optional

from app.services.weather_open_meteo import WeatherPoint

def calendar_features(dt: datetime) -> Dict[str, float]:
    hour = dt.hour
    return {
        "hour_of_day": hour,
        "day_of_week": dt.weekday(),
        "month": dt.month,
        "hour_sin": math.sin(2 * math.pi * hour / 24),
        "hour_cos": math.cos(2 * math.pi * hour / 24),
    }

def weather_features(w: WeatherPoint) -> Dict[str, float]:
    return {
        "temp": w.temp,
        "rhum": w.rhum,
        "prcp": w.prcp,
        "wspd": w.wspd,
        "pres": w.pres,
    }

def optional_lag_features(required_features: List[str]) -> List[str]:
    return [f for f in ["lag_1", "lag_24", "roll_24_mean"] if f in required_features]

def build_features(
    dt: datetime,
    required_features: List[str],
    weather: WeatherPoint,
    lags: Optional[Dict[str, float]] = None,
) -> Dict[str, float]:
    """
    Build only what's needed according to required_features.
    If lag features are required but not provided -> raise.
    """
    feats = {}
    cal = calendar_features(dt)
    we = weather_features(weather)

    for k in cal:
        if k in required_features:
            feats[k] = cal[k]
    for k in we:
        if k in required_features:
            feats[k] = we[k]

    lag_needed = optional_lag_features(required_features)
    if lag_needed:
        if not lags:
            raise ValueError(f"Model requires lag features {lag_needed}, but no lags were provided.")
        for k in lag_needed:
            feats[k] = float(lags[k])

    return feats
