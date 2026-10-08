# NER-LOGIX AI Service

Explainable **rule-based risk scoring** for logistics and road accessibility in Northeast India.

> **The current NER-LOGIX AI engine is an explainable rule-based risk scoring prototype rather than a trained machine-learning model.**

It does **not** implement Random Forest, SVM, CNN, LSTM, XGBoost, or LightGBM.

## Architecture

```
React Frontend
      ↓
Node.js / Express (:5000)
      ↓  POST /analyze-risk | POST /analyze-routes
FastAPI AI Service (:8000)
      ↓
scoring.py  →  Risk / route evaluation
      ↓
Node → React
```

The React app must **never** call this service directly.

## What it does

Analyzes:

- weather (rainfall, temperature, wind, visibility)
- road condition & confirmed blockage
- incident severity
- historical risk context
- route duration / distance (for ranking)

Returns:

- `riskScore` (0–100)
- `riskLevel` (LOW | MODERATE | HIGH | CRITICAL)
- `accessibility` (Accessible | Restricted | Unsafe | Blocked)
- `reasons[]` — human-readable explanations
- `recommendation`

## Risk score semantic

| Score | Meaning |
|------:|---------|
| **100** | Very safe |
| **0** | Very high risk |

| Score range | Level |
|-------------|-------|
| 80–100 | LOW |
| 60–79 | MODERATE |
| 40–59 | HIGH |
| 0–39 | CRITICAL |

A **confirmed road blockage** always yields `accessibility: "Blocked"` regardless of numeric score.

## Risk scoring factors

Starting from safety baseline **100**, penalties are applied for:

1. Higher rainfall  
2. Wet / flooded road surface  
3. Low visibility  
4. High wind  
5. Confirmed blockage (large penalty)  
6. Incident severity  
7. Extreme temperature  
8. Elevated historical risk  

Defaults (only when a field is omitted by a typed client): weather context uses rainfall=0, temperature=25, wind=0, visibility=10, historicalRisk=50. The service does **not** invent live weather, incidents, or road state.

## Route analysis

`POST /analyze-routes` scores OSRM candidates supplied by the Node backend.

**Selection formula** (higher = preferred):

```
composite = 0.55 * riskScore + 0.25 * duration_norm + 0.20 * distance_norm
```

- `duration_norm` / `distance_norm` are inverted relative to the worst candidate in the set  
- Blocked routes get `−∞` and are never recommended  
- Very high-risk routes are further discounted  

Geometry comes from **OSRM**, not this service.

Frontend labels:

- **FASTEST** — lowest duration (OSRM)  
- **SHORTEST** — lowest distance (OSRM)  
- **SAFEST / RECOMMENDED** — AI evaluation  

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service info |
| GET | `/health` | Health check |
| POST | `/analyze-risk` | Corridor risk analysis |
| POST | `/analyze-routes` | Multi-route evaluation |

Interactive docs: `http://127.0.0.1:8000/docs`

### Example — risk

```bash
curl -X POST http://127.0.0.1:8000/analyze-risk \
  -H "Content-Type: application/json" \
  -d '{
    "rainfall": 8.2,
    "temperature": 24,
    "wind": 18,
    "visibility": 8,
    "roadCondition": "wet",
    "roadBlockage": false,
    "incidentSeverity": "moderate",
    "historicalRisk": 55
  }'
```

### Example — routes

```bash
curl -X POST http://127.0.0.1:8000/analyze-routes \
  -H "Content-Type: application/json" \
  -d '{
    "routes": [
      {
        "id": "route-1",
        "distance": 12000,
        "duration": 1800,
        "blocked": false,
        "roadCondition": "dry",
        "incidentSeverity": "none"
      }
    ],
    "weather": {
      "rainfall": 2,
      "temperature": 25,
      "wind": 12,
      "visibility": 10
    },
    "historicalRisk": 50
  }'
```

## Running locally

Requires **Python 3.11+** (3.11 or 3.12 recommended; avoid bleeding-edge versions without wheels).

```bash
cd ai-service

# Prefer 3.11 if multiple versions are installed
# Windows: py -3.11 -m venv .venv
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Server: `http://127.0.0.1:8000`

CORS allows the Node backend (`http://localhost:5000`). The frontend is not the primary client.

## Testing

```bash
cd ai-service
pytest -q
```

Tests cover normal weather, heavy rain, low visibility, high wind, blockage, severity, combined danger, safe vs risky routes, score bounds, and invalid extremes.

## Research foundation

Research context (not an implementation claim):

- GIS-based risk assessment for mountain corridors  
- Landslide susceptibility mapping in Northeast India  
- Route optimization literature (A*, Dijkstra — **not implemented here**; routing is via **OSRM**)  
- Environmental risk factors (rainfall, visibility, surface condition)

### Reference paper

Mihu, S., Tomar, K.K.S., Kumar, A., et al. (2026).  
*Machine Learning-based Landslide Susceptibility Modeling in the Dibang Valley, NE India.*  
Earth Systems and Environment.  
DOI: [10.1007/s41748-026-01036-3](https://doi.org/10.1007/s41748-026-01036-3)

NER-LOGIX does **not** implement the same ML algorithms. The paper informs domain context for hazard-aware logistics in the Northeast.

## Limitations

- Rule-based prototype — thresholds are transparent but not learned from labeled field data  
- No satellite imagery / CNN perception  
- No online learning from fleet telemetry  
- Weather and incidents must be supplied by the Node gateway  
- Suitable for hackathon demos and explainable decision support, not certified safety systems  

## Error handling

| Code | Meaning |
|------|---------|
| 200 | Success |
| 422 | Invalid validation (Pydantic) |
| 500 | Internal error |
