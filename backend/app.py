"""Запуск: python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000."""

import logging
import os
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.llm.answer import GenerationError
from backend.service import RAGService
from backend.settings import ROOT, Settings

logger = logging.getLogger(__name__)


class Vehicle(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    model_code: str
    engine: str | None = None


class AskRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    question: str = Field(min_length=1, max_length=500)
    vehicle: Vehicle

    @field_validator("question")
    @classmethod
    def question_valid(cls, value):
        if not value.strip():
            raise ValueError("Пустой вопрос")
        return value.strip()


def create_app(settings=None, generator=None):
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app):
        try:
            app.state.rag = RAGService(settings, **({"generator": generator} if generator else {}))
        except (OSError, ValueError, KeyError):
            logger.exception("Не удалось загрузить индекс")
            app.state.rag = None
        yield

    app = FastAPI(title="ManualMate", version="0.2.0", lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=os.getenv("FRONTEND_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080").split(","), allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, exc):
        return JSONResponse({"error": "question_invalid"}, status_code=400)

    @app.exception_handler(Exception)
    async def internal_error(request: Request, exc):
        logger.error("Ошибка запроса", exc_info=exc)
        return JSONResponse({"error": "internal"}, status_code=500)

    @app.get("/api/vehicles")
    def vehicles():
        if app.state.rag is None:
            return JSONResponse({"error": "service_unavailable"}, status_code=503)
        return {"vehicles": app.state.rag.vehicles()}

    @app.get("/api/health")
    def health():
        llm = "unavailable"
        try:
            response = httpx.get(settings.ollama_url + "/api/tags", timeout=2, trust_env=False)
            response.raise_for_status()
            if any(m["name"] == settings.model for m in response.json()["models"]):
                llm = "available"
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            pass
        rag = app.state.rag
        ready = rag is not None and llm == "available"
        return {"status": "ok" if ready else "degraded", "index_loaded": rag is not None,
                "chunks": rag.index.n if rag else 0, "llm": llm, "model": settings.model}

    @app.post("/api/ask")
    def ask(payload: AskRequest):
        rag = app.state.rag
        if rag is None:
            return JSONResponse({"error": "service_unavailable"}, status_code=503)
        vehicle = next((v for v in rag.vehicles() if v["model_code"] == payload.vehicle.model_code), None)
        if vehicle is None or (payload.vehicle.engine and payload.vehicle.engine not in {e["code"] for e in vehicle["engines"]}):
            return JSONResponse({"error": "vehicle_unknown"}, status_code=404)
        try:
            return rag.ask(payload.question, payload.vehicle.model_dump(exclude_none=True))
        except GenerationError:
            logger.exception("Ошибка генерации")
            return JSONResponse({"error": "service_unavailable"}, status_code=503)

    app.mount("/", StaticFiles(directory=ROOT / "frontend", html=True), name="frontend")
    return app


app = create_app()
