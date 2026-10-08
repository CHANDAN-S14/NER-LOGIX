"""Pydantic request/response schemas for NER-LOGIX AI service."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


ALLOWED_ROAD_CONDITIONS = {
    "dry",
    "normal",
    "wet",
    "damp",
    "flooded",
    "unknown",
}

ALLOWED_INCIDENT_SEVERITIES = {
    "none",
    "low",
    "moderate",
    "high",
    "blocked",
}


class RiskRequest(BaseModel):
    """Inputs for corridor / location risk analysis."""

    rainfall: float = Field(..., description="Precipitation in mm (recent/current)")
    temperature: float = Field(..., description="Air temperature in °C")
    wind: float = Field(..., description="Wind speed in km/h (or m/s as provided by caller)")
    visibility: float = Field(..., description="Visibility in km")
    roadCondition: str = Field(..., description="Road surface condition")
    roadBlockage: bool = Field(..., description="Confirmed road blockage from road system")
    incidentSeverity: str = Field(..., description="Highest relevant incident severity")
    historicalRisk: float = Field(
        ...,
        ge=0,
        le=100,
        description="Contextual historical risk factor 0-100 (higher = more historical hazard)",
    )

    @field_validator("rainfall", "wind")
    @classmethod
    def non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("must be >= 0")
        return v

    @field_validator("visibility")
    @classmethod
    def visibility_range(cls, v: float) -> float:
        if v < 0:
            raise ValueError("visibility must be >= 0")
        return v

    @field_validator("roadCondition")
    @classmethod
    def normalize_road_condition(cls, v: str) -> str:
        value = (v or "normal").strip().lower()
        if value not in ALLOWED_ROAD_CONDITIONS:
            # Accept unknown labels without inventing conditions — map to unknown
            return "unknown"
        return value

    @field_validator("incidentSeverity")
    @classmethod
    def normalize_severity(cls, v: str) -> str:
        value = (v or "none").strip().lower()
        if value not in ALLOWED_INCIDENT_SEVERITIES:
            return "none"
        return value


class RiskResponse(BaseModel):
    riskScore: float = Field(..., ge=0, le=100)
    riskLevel: str
    accessibility: str
    reasons: List[str]
    recommendation: str


class RouteCandidate(BaseModel):
    id: str
    distance: float = Field(..., ge=0, description="meters")
    duration: float = Field(..., ge=0, description="seconds")
    blocked: bool = False
    roadCondition: str = "normal"
    incidentSeverity: str = "none"

    @field_validator("roadCondition")
    @classmethod
    def normalize_road_condition(cls, v: str) -> str:
        value = (v or "normal").strip().lower()
        if value not in ALLOWED_ROAD_CONDITIONS:
            return "unknown"
        return value

    @field_validator("incidentSeverity")
    @classmethod
    def normalize_severity(cls, v: str) -> str:
        value = (v or "none").strip().lower()
        if value not in ALLOWED_INCIDENT_SEVERITIES:
            return "none"
        return value


class WeatherContext(BaseModel):
    rainfall: float = 0
    temperature: float = 25
    wind: float = 0
    visibility: float = 10


class RouteAnalysisRequest(BaseModel):
    routes: List[RouteCandidate] = Field(..., min_length=1)
    weather: Optional[WeatherContext] = None
    historicalRisk: float = Field(50, ge=0, le=100)


class EvaluatedRoute(BaseModel):
    id: str
    distance: float
    duration: float
    riskScore: float
    riskLevel: str
    accessibility: str
    recommendation: str
    reasons: List[str] = Field(default_factory=list)


class RouteAnalysisResponse(BaseModel):
    routes: List[EvaluatedRoute]
    recommendedRouteId: Optional[str] = None
