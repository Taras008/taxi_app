from app.config import settings
from app.services.model_store import ModelStore
from app.services.weather_open_meteo import WeatherClient
from app.services.lag_provider import BaselineLagProvider

model_store = ModelStore(settings.model_path, settings.schema_path)
weather_client = WeatherClient(ttl_seconds=settings.weather_cache_ttl)

lag_provider = BaselineLagProvider("artifacts/demand_baseline.csv")


