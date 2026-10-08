"""
NER-LOGIX AI — Rule-based explainable risk scoring engine.

Semantic (consistent everywhere):
  riskScore 0   = very high risk (critical / unsafe)
  riskScore 100 = very safe

Levels:
  80–100 → LOW
  60–79  → MODERATE
  40–59  → HIGH
  0–39   → CRITICAL

This is NOT a trained ML model (no Random Forest / SVM / CNN / LSTM / XGBoost).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple


def clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def risk_level(score: float) -> str:
    """Map safety score to discrete risk level."""
    s = clamp(score)
    if s >= 80:
        return "LOW"
    if s >= 60:
        return "MODERATE"
    if s >= 40:
        return "HIGH"
    return "CRITICAL"


def accessibility(score: float, blocked: bool) -> str:
    """
    Confirmed road blockage always yields Blocked, regardless of numeric score.
    """
    if blocked:
        return "Blocked"
    s = clamp(score)
    if s >= 80:
        return "Accessible"
    if s >= 60:
        return "Restricted"
    if s >= 40:
        return "Unsafe"
    return "Unsafe"


def recommendation_for(level: str, blocked: bool) -> str:
    if blocked:
        return "Road is blocked. Use an alternative route."
    if level == "LOW":
        return "Normal travel conditions. Continue with standard monitoring."
    if level == "MODERATE":
        return "Travel is possible, but monitor changing weather and road conditions."
    if level == "HIGH":
        return "Use caution and consider an alternative route."
    return "Avoid this corridor until conditions improve."


def _as_dict(payload: Any) -> Dict[str, Any]:
    if hasattr(payload, "model_dump"):
        return payload.model_dump()
    if isinstance(payload, dict):
        return payload
    raise TypeError("payload must be a dict or Pydantic model")


def analyze_risk(payload: Any) -> Dict[str, Any]:
    """
    Explainable risk analysis from environmental + infrastructure factors.

    Starts from a safety baseline of 100 and subtracts penalties.
    """
    data = _as_dict(payload)

    rainfall = float(data.get("rainfall", 0) or 0)
    temperature = float(data.get("temperature", 25) if data.get("temperature") is not None else 25)
    wind = float(data.get("wind", 0) or 0)
    visibility = float(data.get("visibility", 10) if data.get("visibility") is not None else 10)
    road_condition = str(data.get("roadCondition") or "normal").lower()
    road_blockage = bool(data.get("roadBlockage", False))
    incident_severity = str(data.get("incidentSeverity") or "none").lower()
    historical_risk = float(data.get("historicalRisk", 50) if data.get("historicalRisk") is not None else 50)

    score = 100.0
    reasons: List[str] = []

    # ── 1. Rainfall ──────────────────────────────────────
    if rainfall >= 50:
        score -= 35
        reasons.append("Heavy rainfall increases corridor risk.")
    elif rainfall >= 25:
        score -= 22
        reasons.append("Elevated rainfall increases corridor risk.")
    elif rainfall >= 10:
        score -= 12
        reasons.append("Rainfall is elevated.")
    elif rainfall >= 2:
        score -= 5
        reasons.append("Light rainfall present.")
    else:
        reasons.append("Low rainfall.")

    # ── 2. Road condition ────────────────────────────────
    condition_penalties = {
        "dry": 0,
        "normal": 2,
        "damp": 8,
        "wet": 15,
        "flooded": 40,
        "unknown": 5,
    }
    pen = condition_penalties.get(road_condition, 5)
    score -= pen
    if road_condition == "flooded":
        reasons.append("Road surface is flooded.")
    elif road_condition == "wet":
        reasons.append("Road surface is wet.")
    elif road_condition == "damp":
        reasons.append("Road surface is damp.")
    elif road_condition in ("dry", "normal"):
        reasons.append("Road surface condition is acceptable.")

    # ── 3. Visibility (km) ───────────────────────────────
    if visibility < 0.5:
        score -= 30
        reasons.append("Extremely low visibility reduces driving safety.")
    elif visibility < 1:
        score -= 22
        reasons.append("Low visibility reduces driving safety.")
    elif visibility < 3:
        score -= 12
        reasons.append("Reduced visibility affects driving safety.")
    elif visibility < 5:
        score -= 5
        reasons.append("Visibility is limited.")
    else:
        reasons.append("Good visibility.")

    # ── 4. Wind ──────────────────────────────────────────
    if wind >= 60:
        score -= 25
        reasons.append("Dangerously high wind increases travel risk.")
    elif wind >= 40:
        score -= 15
        reasons.append("High wind increases travel risk.")
    elif wind >= 25:
        score -= 8
        reasons.append("Elevated wind conditions.")
    elif wind < 15:
        reasons.append("Wind conditions are calm.")

    # ── 5. Confirmed road blockage ───────────────────────
    if road_blockage:
        score -= 50
        reasons.append("Confirmed road blockage prevents normal access.")

    # ── 6. Incident severity ─────────────────────────────
    severity_penalties = {
        "none": 0,
        "low": 5,
        "moderate": 12,
        "high": 22,
        "blocked": 35,
    }
    sev_pen = severity_penalties.get(incident_severity, 0)
    score -= sev_pen
    if incident_severity in ("high", "blocked"):
        reasons.append("High incident severity increases risk.")
    elif incident_severity == "moderate":
        reasons.append("Moderate incident severity increases risk.")
    elif incident_severity == "low":
        reasons.append("Low-severity incident reported nearby.")

    # ── 7. Temperature extremes (°C) ─────────────────────
    if temperature <= 0:
        score -= 15
        reasons.append("Freezing temperatures may create hazardous road surfaces.")
    elif temperature >= 42:
        score -= 10
        reasons.append("Extreme heat may affect vehicle and driver performance.")
    elif 15 <= temperature <= 32:
        reasons.append("Temperature is within a normal operating range.")

    # ── 8. Historical risk (0–100 hazard context) ────────
    # Higher historical risk → larger safety penalty
    hist_pen = (historical_risk / 100.0) * 15.0
    score -= hist_pen
    if historical_risk >= 70:
        reasons.append("Historical corridor risk is elevated.")
    elif historical_risk <= 30:
        reasons.append("Historical corridor risk is relatively low.")

    score = round(clamp(score), 1)
    level = risk_level(score)
    access = accessibility(score, road_blockage)

    # Limit reasons to a reasonable number (prefer more specific ones already ordered)
    if len(reasons) > 6:
        # Keep blockage / severe first if present, then truncate
        priority = [r for r in reasons if "blockage" in r.lower() or "flooded" in r.lower() or "Heavy" in r]
        rest = [r for r in reasons if r not in priority]
        reasons = (priority + rest)[:6]

    return {
        "riskScore": score,
        "riskLevel": level,
        "accessibility": access,
        "reasons": reasons,
        "recommendation": recommendation_for(level, road_blockage),
    }


def _route_composite(
    risk_score: float,
    blocked: bool,
    duration: float,
    distance: float,
    max_duration: float,
    max_distance: float,
) -> float:
    """
    Transparent route selection score (higher = better to recommend).

    composite = 0.55 * riskScore
              + 0.25 * duration_norm
              + 0.20 * distance_norm

    where duration_norm / distance_norm are inverted relative to the
    worst candidate in the set (shorter/faster → higher).

    Blocked routes receive composite = -inf (never recommended).
    """
    if blocked:
        return float("-inf")

    dur_norm = 100.0 if max_duration <= 0 else (1.0 - (duration / max_duration)) * 100.0
    dist_norm = 100.0 if max_distance <= 0 else (1.0 - (distance / max_distance)) * 100.0

    # Penalize very high risk further
    risk_component = risk_score
    if risk_score < 40:
        risk_component *= 0.5
    elif risk_score < 60:
        risk_component *= 0.85

    return 0.55 * risk_component + 0.25 * dur_norm + 0.20 * dist_norm


def analyze_routes(
    routes: List[Any],
    weather: Optional[Any] = None,
    historical_risk: float = 50.0,
) -> Dict[str, Any]:
    """
    Evaluate each OSRM route candidate with the same risk engine.
    Does not generate geometries — only scores provided candidates.
    """
    weather_data = _as_dict(weather) if weather is not None else {
        "rainfall": 0,
        "temperature": 25,
        "wind": 0,
        "visibility": 10,
    }

    parsed: List[Dict[str, Any]] = []
    for r in routes:
        parsed.append(_as_dict(r))

    if not parsed:
        return {"routes": [], "recommendedRouteId": None}

    max_duration = max(float(r.get("duration") or 0) for r in parsed) or 1.0
    max_distance = max(float(r.get("distance") or 0) for r in parsed) or 1.0

    evaluated: List[Dict[str, Any]] = []
    composites: List[Tuple[str, float]] = []

    for r in parsed:
        blocked = bool(r.get("blocked", False))
        risk_payload = {
            "rainfall": float(weather_data.get("rainfall", 0) or 0),
            "temperature": float(
                weather_data.get("temperature", 25)
                if weather_data.get("temperature") is not None
                else 25
            ),
            "wind": float(weather_data.get("wind", 0) or 0),
            "visibility": float(
                weather_data.get("visibility", 10)
                if weather_data.get("visibility") is not None
                else 10
            ),
            "roadCondition": str(r.get("roadCondition") or "normal"),
            "roadBlockage": blocked,
            "incidentSeverity": str(r.get("incidentSeverity") or "none"),
            "historicalRisk": float(historical_risk),
        }

        # Mild duration/distance stress factors for very long corridors
        duration = float(r.get("duration") or 0)
        distance = float(r.get("distance") or 0)
        if duration > 7200:  # > 2h
            risk_payload["historicalRisk"] = min(100.0, risk_payload["historicalRisk"] + 5)
        if distance > 100_000:  # > 100 km
            risk_payload["historicalRisk"] = min(100.0, risk_payload["historicalRisk"] + 3)

        result = analyze_risk(risk_payload)
        route_id = str(r.get("id"))

        comp = _route_composite(
            result["riskScore"],
            blocked,
            duration,
            distance,
            max_duration,
            max_distance,
        )
        composites.append((route_id, comp))

        evaluated.append(
            {
                "id": route_id,
                "distance": distance,
                "duration": duration,
                "riskScore": result["riskScore"],
                "riskLevel": result["riskLevel"],
                "accessibility": result["accessibility"],
                "recommendation": result["recommendation"],
                "reasons": result["reasons"],
            }
        )

    # Select best non-blocked route
    recommended: Optional[str] = None
    best_score = float("-inf")
    for rid, comp in composites:
        if comp > best_score:
            best_score = comp
            recommended = rid

    if recommended is not None and best_score == float("-inf"):
        recommended = None

    # Mark recommendation text on the chosen route
    if recommended:
        for e in evaluated:
            if e["id"] == recommended and e["accessibility"] != "Blocked":
                e["recommendation"] = "Recommended route - best balance of safety and travel time."

    return {
        "routes": evaluated,
        "recommendedRouteId": recommended,
    }
