"""
NER-LOGIX AI Service — FastAPI entrypoint.

Rule-based explainable risk scoring for Northeast India logistics corridors.
Consumed by the Node.js backend only — not the React frontend.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from schemas import (
    RiskRequest,
    RiskResponse,
    RouteAnalysisRequest,
    RouteAnalysisResponse,
)
from scoring import analyze_risk, analyze_routes

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ner-logix-ai")

CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5000,http://127.0.0.1:5000",
    ).split(",")
    if o.strip()
]

app = FastAPI(
    title="NER-LOGIX AI Service",
    description=(
        "Explainable rule-based risk scoring for logistics and road accessibility "
        "in Northeast India. Not a trained machine-learning model."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    logger.info("NER-LOGIX AI Service starting (rule-based risk scoring)")
    logger.info("CORS origins: %s", CORS_ORIGINS)


@app.get("/")
async def root() -> Dict[str, Any]:
    return {
        "service": "NER-LOGIX AI Service",
        "engine": "rule-based risk scoring",
        "endpoints": ["/health", "/analyze-risk", "/analyze-routes", "/docs"],
        "note": (
            "The current NER-LOGIX AI engine is an explainable rule-based risk "
            "scoring prototype rather than a trained machine-learning model."
        ),
    }


@app.get("/health")
async def health() -> Dict[str, str]:
    return {
        "status": "ok",
        "service": "NER-LOGIX AI Service",
        "engine": "rule-based risk scoring",
    }


@app.post("/analyze-risk", response_model=RiskResponse)
async def analyze_risk_endpoint(payload: RiskRequest) -> Dict[str, Any]:
    logger.info(
        "analyze-risk request rainfall=%.1f visibility=%.1f blockage=%s severity=%s",
        payload.rainfall,
        payload.visibility,
        payload.roadBlockage,
        payload.incidentSeverity,
    )
    try:
        result = analyze_risk(payload)
        logger.info(
            "analyze-risk complete score=%.1f level=%s",
            result["riskScore"],
            result["riskLevel"],
        )
        return result
    except Exception as exc:  # noqa: BLE001
        logger.exception("analyze-risk failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/analyze-routes", response_model=RouteAnalysisResponse)
async def analyze_routes_endpoint(payload: RouteAnalysisRequest) -> Dict[str, Any]:
    logger.info("analyze-routes request n=%d", len(payload.routes))
    try:
        result = analyze_routes(
            routes=payload.routes,
            weather=payload.weather,
            historical_risk=payload.historicalRisk,
        )
        logger.info(
            "analyze-routes complete recommended=%s",
            result.get("recommendedRouteId"),
        )
        return result
    except Exception as exc:  # noqa: BLE001
        logger.exception("analyze-routes failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500, content={"error": "Internal server error"})
