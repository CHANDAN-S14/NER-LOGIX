"""Unit tests for NER-LOGIX rule-based risk scoring."""

import pytest

from scoring import analyze_risk, analyze_routes, clamp, risk_level


def _base(**overrides):
    data = {
        "rainfall": 0,
        "temperature": 25,
        "wind": 10,
        "visibility": 10,
        "roadCondition": "dry",
        "roadBlockage": False,
        "incidentSeverity": "none",
        "historicalRisk": 30,
    }
    data.update(overrides)
    return data


def test_normal_weather_is_low_risk():
    result = analyze_risk(_base())
    assert 0 <= result["riskScore"] <= 100
    assert result["riskLevel"] == "LOW"
    assert result["accessibility"] == "Accessible"
    assert result["reasons"]
    assert "Normal travel" in result["recommendation"] or "standard monitoring" in result["recommendation"]


def test_heavy_rainfall_increases_risk():
    safe = analyze_risk(_base(rainfall=0))
    heavy = analyze_risk(_base(rainfall=55))
    assert heavy["riskScore"] < safe["riskScore"]
    assert any("rain" in r.lower() for r in heavy["reasons"])


def test_low_visibility_increases_risk():
    safe = analyze_risk(_base(visibility=10))
    foggy = analyze_risk(_base(visibility=0.4))
    assert foggy["riskScore"] < safe["riskScore"]
    assert any("visibility" in r.lower() for r in foggy["reasons"])


def test_high_wind_increases_risk():
    calm = analyze_risk(_base(wind=5))
    windy = analyze_risk(_base(wind=65))
    assert windy["riskScore"] < calm["riskScore"]
    assert any("wind" in r.lower() for r in windy["reasons"])


def test_blocked_road_accessibility():
    result = analyze_risk(_base(roadBlockage=True))
    assert result["accessibility"] == "Blocked"
    assert "blocked" in result["recommendation"].lower() or "alternative" in result["recommendation"].lower()
    assert any("blockage" in r.lower() for r in result["reasons"])


def test_high_severity_incident():
    none = analyze_risk(_base(incidentSeverity="none"))
    high = analyze_risk(_base(incidentSeverity="high"))
    assert high["riskScore"] < none["riskScore"]
    assert any("incident" in r.lower() or "severity" in r.lower() for r in high["reasons"])


def test_combined_dangerous_conditions():
    result = analyze_risk(
        _base(
            rainfall=60,
            visibility=0.5,
            wind=50,
            roadCondition="flooded",
            roadBlockage=False,
            incidentSeverity="high",
            historicalRisk=80,
        )
    )
    assert result["riskScore"] <= 40
    assert result["riskLevel"] in ("HIGH", "CRITICAL")
    assert len(result["reasons"]) >= 3


def test_safe_route_vs_risky_route():
    result = analyze_routes(
        routes=[
            {
                "id": "safe",
                "distance": 15000,
                "duration": 2000,
                "blocked": False,
                "roadCondition": "dry",
                "incidentSeverity": "none",
            },
            {
                "id": "risky",
                "distance": 12000,
                "duration": 1600,
                "blocked": False,
                "roadCondition": "flooded",
                "incidentSeverity": "high",
            },
        ],
        weather={"rainfall": 5, "temperature": 25, "wind": 10, "visibility": 10},
        historical_risk=40,
    )
    by_id = {r["id"]: r for r in result["routes"]}
    assert by_id["safe"]["riskScore"] > by_id["risky"]["riskScore"]
    assert result["recommendedRouteId"] == "safe"


def test_blocked_route_not_recommended():
    result = analyze_routes(
        routes=[
            {
                "id": "blocked",
                "distance": 10000,
                "duration": 1000,
                "blocked": True,
                "roadCondition": "dry",
                "incidentSeverity": "none",
            },
            {
                "id": "open",
                "distance": 14000,
                "duration": 1500,
                "blocked": False,
                "roadCondition": "dry",
                "incidentSeverity": "none",
            },
        ],
        weather={"rainfall": 0, "temperature": 25, "wind": 5, "visibility": 12},
        historical_risk=30,
    )
    assert result["recommendedRouteId"] == "open"
    blocked = next(r for r in result["routes"] if r["id"] == "blocked")
    assert blocked["accessibility"] == "Blocked"


def test_invalid_negative_handled_by_schema_or_clamp():
    # Direct scoring clamp still keeps 0-100 even with extreme inputs
    result = analyze_risk(_base(rainfall=999, wind=999, visibility=0, historicalRisk=100))
    assert 0 <= result["riskScore"] <= 100


def test_score_remains_0_to_100():
    samples = [
        _base(),
        _base(rainfall=100, visibility=0, wind=100, roadCondition="flooded", roadBlockage=True),
        _base(historicalRisk=0, rainfall=0, visibility=20),
    ]
    for s in samples:
        result = analyze_risk(s)
        assert 0 <= result["riskScore"] <= 100


def test_risk_level_thresholds():
    assert risk_level(95) == "LOW"
    assert risk_level(70) == "MODERATE"
    assert risk_level(50) == "HIGH"
    assert risk_level(20) == "CRITICAL"


def test_clamp():
    assert clamp(-5) == 0
    assert clamp(150) == 100
    assert clamp(42) == 42


def test_wet_road_reason():
    result = analyze_risk(_base(roadCondition="wet"))
    assert any("wet" in r.lower() for r in result["reasons"])
