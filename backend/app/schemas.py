from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, conint

class PredictRequest(BaseModel):
    target_datetime: datetime = Field(..., description="ISO datetime, e.g. 2026-01-03T14:00:00")

class PredictResponse(BaseModel):
    target_datetime: datetime
    demand: float
    unit: str = "rides_per_hour"
    weather_used: dict
    features_used: dict
    warnings: List[str] = []

class ForecastRequest(BaseModel):
    start_datetime: datetime = Field(..., description="Start ISO datetime (floored to hour)")
    hours: conint(ge=1, le=168) = Field(168, description="Forecast horizon in hours (max 168)")

class ForecastPoint(BaseModel):
    datetime: datetime
    demand: float
    weather_used: dict

class ForecastResponse(BaseModel):
    start_datetime: datetime
    hours: int
    unit: str = "rides_per_hour"
    predictions: List[ForecastPoint]
    warnings: List[str] = []

class ModelInfo(BaseModel):
    model_loaded: bool
    features: List[str]
    model_path: str
    schema_path: str
