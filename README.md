# NER-LOGIX AI

Smart Logistics & Accessibility Intelligence Platform for Northeast India.

```
React (Vite :5173)  →  Node/Express (:5000)  →  Python AI (:8000)
                     ↘ OSRM / Open-Meteo / SACHET
```

## Quick start (full stack)

```bash
# 1) AI service (Python 3.11+)
cd ai-service
py -3.11 -m venv .venv
.\.venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 2) Backend (Node 18+, MongoDB running)
cd ../backend
npm install
cp .env.example .env
npm run seed
npm run dev

# 3) Frontend
cd ..
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:5000
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

See `backend/README.md` and `ai-service/README.md` for API details.

## Frontend

Built with **React + Vite + Tailwind CSS + React-Leaflet + Socket.IO Client**.

## Environment

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Node/Express backend base URL (e.g. `http://localhost:5000`) |
| `VITE_SOCKET_URL` | Socket.IO server (defaults to `VITE_API_URL`) |

All HTTP calls go through `src/services/api.js`. Do not hardcode localhost in components.

## Architecture

```
src/
├── components/
│   ├── layout/      Header, Sidebar, ProtectedRoute
│   ├── map/         LiveMap, controls, legend, markers
│   ├── route/       RoutePlanner, RouteCards
│   ├── risk/        AiRiskPanel
│   ├── telemetry/   TelemetryPanel, WeatherPanel
│   ├── vehicles/    VehiclePanel (demo + live)
│   ├── incidents/   IncidentPanel, RoadBlockagePanel
│   └── common/      Badge, Button, Card, LocationSearch, StatusBanner
├── context/         AuthContext, AppDataContext
├── services/        api, socket, weather, geocode, config
├── pages/           Dashboard, Login
├── hooks/           useGeolocation
└── utils/           risk, geo, format
```

## Backend contracts (expected)

- `GET /api/status`
- `POST /api/auth/login` · `GET /api/auth/me`
- `GET|POST /api/incidents`
- `GET /api/roads` · `GET /api/roads/blocked`
- `GET /api/vehicles`
- `POST /api/routes/plan`
- `POST /api/ai/risk-analysis` · `POST /api/ai/route-analysis`
- `GET /api/weather?lat=&lon=`
- `GET /api/sachet/alerts`

Socket events: `incident:new`, `incident:updated`, `road:blocked`, `road:updated`, `vehicle:location`, `live:update`.

## Data honesty

| Label | Meaning |
|-------|---------|
| **LIVE SYSTEM** | Backend `/api/status` reachable |
| **OFFLINE** | Backend unreachable — no fake metrics |
| **DEMO FLEET** | NER-01 / NER-02 / NER-03 hackathon simulation |
| **AI ANALYSIS UNAVAILABLE** | AI service error / offline |
| **POTENTIAL HAZARD** | SACHET/NDMA alert (not a confirmed blockage) |
| **CONFIRMED BLOCKAGE** | Backend-confirmed blocked road |

Weather uses Open-Meteo (via backend proxy when available, direct fallback for local UI). Location search uses Nominatim. Map tiles: OSM / Esri satellite / OpenTopoMap.

## Auth roles

JWT roles from the backend: `ADMIN`, `OPERATOR`, `USER` (see `src/services/config.js`).

## Scripts

```bash
npm run dev      # development
npm run build    # production bundle
npm run preview  # preview build
```
