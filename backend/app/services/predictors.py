from __future__ import annotations
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import pandas as pd
import pytz
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
    
    # Convert dt_h to the timezone used by the API
    # If dt_h is timezone-aware, convert it; if naive, assume UTC
    if dt_h.tzinfo is None:
        dt_h = pytz.UTC.localize(dt_h)
    
    # Convert to the target timezone
    tz = pytz.timezone(timezone)
    dt_h_local = dt_h.astimezone(tz)
    # Remove timezone info to match what API returns (naive datetime in local timezone)
    dt_h_local_naive = dt_h_local.replace(tzinfo=None)
    
    m = await weather_client.fetch_hourly_map(
        lat=lat, lon=lon,
        start_dt=dt_h,
        end_dt=dt_h,
        timezone=timezone,
    )
    
    # Search using the local timezone version
    wp = m.get(pd.Timestamp(dt_h_local_naive))
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
    
    # Convert to timezone-aware if needed
    if start_h.tzinfo is None:
        start_h = pytz.UTC.localize(start_h)
    
    tz = pytz.timezone(timezone)
    end_h = start_h + timedelta(hours=hours)

    weather_map = await weather_client.fetch_hourly_map(
        lat=lat, lon=lon, start_dt=start_h, end_dt=end_h, timezone=timezone
    )

    preds: List[dict] = []
    for i in range(hours):
        ts = start_h + timedelta(hours=i)
        # Convert to local timezone for lookup
        ts_local = ts.astimezone(tz)
        ts_local_naive = ts_local.replace(tzinfo=None)
        
        wp = weather_map.get(pd.Timestamp(ts_local_naive))
        if wp is None:
            raise ValueError(f"No weather for hour {ts}.")
        feats = build_features(ts, model_store.features, wp, lags=None)
        yhat = model_store.predict_one(feats)
        preds.append({"datetime": ts, "demand": yhat, "weather_used": wp.__dict__})

    return preds, warnings
