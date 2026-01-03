from pydantic import BaseModel

class Settings(BaseModel):
    model_path: str = "artifacts/rf_model.joblib"
    schema_path: str = "artifacts/feature_schema.json"

    # Location for weather forecast (NYC by default)
    latitude: float = 40.7128
    longitude: float = -74.0060
    timezone: str = "America/New_York"

    # Weather cache TTL (seconds)
    weather_cache_ttl: int = 15 * 60

settings = Settings()
