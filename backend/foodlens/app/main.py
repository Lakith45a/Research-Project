from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.nutrition import router as nutrition_router
from app.api.routes.prediction import router as prediction_router
from app.core.config import (
    CORS_ALLOW_HEADERS,
    CORS_ALLOW_METHODS,
    CORS_ALLOW_ORIGINS,
)


def create_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ALLOW_ORIGINS,
        allow_methods=CORS_ALLOW_METHODS,
        allow_headers=CORS_ALLOW_HEADERS,
    )
    app.include_router(nutrition_router)
    app.include_router(prediction_router)
    return app


app = create_app()
