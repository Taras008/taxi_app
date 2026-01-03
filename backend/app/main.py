from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.deps import model_store, weather_client, lag_provider
from app.schemas import (
    PredictRequest, PredictResponse,
    ForecastRequest, ForecastResponse, ForecastPoint,
    ModelInfo,
)
from app.services.predictors import predict_single, forecast_range

app = FastAPI(title="Taxi Demand API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/model-info", response_model=ModelInfo)
def model_info():
    return ModelInfo(
        model_loaded=model_store.model is not None,
        features=model_store.features,
        model_path=settings.model_path,
        schema_path=settings.schema_path,
    )

@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    try:
        yhat, weather_used, feats, warnings = await predict_single(
            model_store=model_store,
            weather_client=weather_client,
            lat=settings.latitude,
            lon=settings.longitude,
            timezone=settings.timezone,
            target_dt=req.target_datetime,
            lag_provider=lag_provider,
        )
        return PredictResponse(
            target_datetime=req.target_datetime.replace(minute=0, second=0, microsecond=0),
            demand=yhat,
            weather_used=weather_used,
            features_used=feats,
            warnings=warnings,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service error: {e}")

@app.post("/forecast", response_model=ForecastResponse)
async def forecast(req: ForecastRequest):
    try:
        preds, warnings = await forecast_range(
            model_store=model_store,
            weather_client=weather_client,
            lat=settings.latitude,
            lon=settings.longitude,
            timezone=settings.timezone,
            start_dt=req.start_datetime,
            hours=req.hours,
        )
        return ForecastResponse(
            start_datetime=req.start_datetime.replace(minute=0, second=0, microsecond=0),
            hours=req.hours,
            predictions=[ForecastPoint(**p) for p in preds],
            warnings=warnings,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service error: {e}")
