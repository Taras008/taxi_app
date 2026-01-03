from __future__ import annotations
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
from app.services.lag_provider import BaselineLagProvider
from app.services.feature_builder import build_features
from app.services.weather_open_meteo import WeatherClient, WeatherPoint
from app.services.model_store import ModelStore

def floor_to_hour(dt: datetime) -> datetime:
    return dt.replace(minute=0, second=0, microsecond=0)

async def get_weather_for_hour(
    weather_client: WeatherClient,
    lat: float,
    lon: float,
    timezone: str,
    dt: datetime,
) -> WeatherPoint:
    dt_h = floor_to_hour(dt)
    m = await weather_client.fetch_hourly_map(
        lat=lat, lon=lon,
        start_dt=dt_h,
        end_dt=dt_h,
        timezone=timezone,
    )
    wp = m.get(dt_h)
    if wp is None:
        raise ValueError("Weather API did not return data for the requested hour (timezone mismatch?)")
    return wp

async def predict_single(
    model_store: ModelStore,
    weather_client: WeatherClient,
    lat: float,
    lon: float,
    timezone: str,
    target_dt: datetime,
    lag_provider: BaselineLagProvider,
) -> Tuple[float, dict, dict, List[str]]:
    
    warnings: List[str] = []
    dt_h = floor_to_hour(target_dt)

    wp = await get_weather_for_hour(weather_client, lat, lon, timezone, dt_h)

    lags = None
    if any(f in model_store.features for f in ["lag_1", "lag_24", "roll_24_mean"]):
        lags = lag_provider.get_lags(dt_h)
    
    feats = build_features(
        dt=dt_h,
        required_features=model_store.features,
        weather=wp,
        lags=lags,
    )

    yhat = model_store.predict_one(feats)

    return yhat, wp.__dict__, feats, warnings

async def forecast_range(
    model_store: ModelStore,
    weather_client: WeatherClient,
    lat: float,
    lon: float,
    timezone: str,
    start_dt: datetime,
    hours: int,
) -> Tuple[List[dict], List[str]]:
    """
    Forecast many hours. For MVP: works only if model has no lags.
    Later you can swap in recursive logic with lags provider.
    """
    warnings: List[str] = []
    start_h = floor_to_hour(start_dt)
    end_h = start_h + timedelta(hours=hours)

    weather_map = await weather_client.fetch_hourly_map(
        lat=lat, lon=lon, start_dt=start_h, end_dt=end_h, timezone=timezone
    )

    preds: List[dict] = []
    for i in range(hours):
        ts = start_h + timedelta(hours=i)
        wp = weather_map.get(ts)
        if wp is None:
            raise ValueError(f"No weather for hour {ts}.")
        feats = build_features(ts, model_store.features, wp, lags=None)
        yhat = model_store.predict_one(feats)
        preds.append({"datetime": ts, "demand": yhat, "weather_used": wp.__dict__})

    return preds, warnings
