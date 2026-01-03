from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, date
from typing import Dict, Tuple

import httpx
import pandas as pd

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

@dataclass(frozen=True)
class WeatherPoint:
    temp: float
    rhum: float
    prcp: float
    wspd: float
    pres: float

class WeatherClient:
    def __init__(self, ttl_seconds: int = 900):
        self.ttl = ttl_seconds
        self._cache: Dict[Tuple, Tuple[float, Dict[pd.Timestamp, WeatherPoint]]] = {}

    async def fetch_hourly_map(
        self,
        lat: float,
        lon: float,
        start_dt: datetime,
        end_dt: datetime,
        timezone: str,
    ) -> Dict[pd.Timestamp, WeatherPoint]:
        """
        1 request for [start_date..end_date] inclusive, returns hourly map.
        Caches by (lat, lon, start_date, end_date, timezone).
        """
        import time
        start_date = start_dt.date()
        end_date = end_dt.date()
        key = (lat, lon, start_date.isoformat(), end_date.isoformat(), timezone)

        now = time.time()
        if key in self._cache:
            ts_cached, data = self._cache[key]
            if now - ts_cached < self.ttl:
                return data

        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": ",".join([
                "temperature_2m",
                "relativehumidity_2m",
                "precipitation",
                "windspeed_10m",
                "pressure_msl",
            ]),
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "timezone": timezone,
        }

        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(OPEN_METEO_URL, params=params)
            r.raise_for_status()
            payload = r.json()

        hourly = payload["hourly"]
        times = pd.to_datetime(hourly["time"])

        out: Dict[pd.Timestamp, WeatherPoint] = {}
        for i, t in enumerate(times):
            out[pd.Timestamp(t)] = WeatherPoint(
                temp=float(hourly["temperature_2m"][i]),
                rhum=float(hourly["relativehumidity_2m"][i]),
                prcp=float(hourly["precipitation"][i]),
                wspd=float(hourly["windspeed_10m"][i]),
                pres=float(hourly["pressure_msl"][i]),
            )

        self._cache[key] = (now, out)
        return out
