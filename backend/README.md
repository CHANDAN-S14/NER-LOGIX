# NER-LOGIX AI — Backend API

Node.js / Express gateway for **AI-Based Smart Logistics & Accessibility Intelligence Platform for Northeast India**.

The React frontend talks **only** to this API. External services (OSRM, Open-Meteo, SACHET/NDMA, Python AI) are proxied here.

```
React (Vite :5173)
      ↓
Node / Express (:5000)  ← you are here
      ↓
Python AI Service (:8000) | OSRM | Open-Meteo | SACHET
```

## Installation

```bash
cd backend
npm install
cp .env.example .env
# Edit JWT_SECRET and MONGODB_URI as needed
```

Requires **Node.js 18+** (native `fetch`) and **MongoDB** running locally (or a reachable URI).

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `5000` | HTTP + Socket.IO port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/ner_logix` | MongoDB |
| `JWT_SECRET` | — | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `AI_SERVICE_URL` | `http://127.0.0.1:8000` | Python FastAPI AI |
| `OSRM_URL` | public OSRM driving | Route planning |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |
| `SACHET_CAP_URL` | NDMA India RSS | Hazard alerts |

Do not commit real secrets. `.env` is for local development only.

## MongoDB

Database name: **`ner_logix`**

Start MongoDB, then seed demo data:

```bash
npm run seed
```

Seed creates:

- Vehicles **NER-01**, **NER-02**, **NER-03** (`source: Demo fleet`, `mode: Hackathon simulation`)
- Optional demo road segments (clearly marked)
- Bootstrap `ADMIN` / `OPERATOR` / `USER` accounts (hackathon defaults)

Does **not** seed weather, SACHET alerts, or fake live telemetry.

### Default seed accounts

| Role | Email | Password |
|------|-------|----------|
| ADMIN | `admin@nerlogix.local` | `Admin@123456` |
| OPERATOR | `operator@nerlogix.local` | `Operator@123` |
| USER | `user@nerlogix.local` | `User@123456` |

## Running the server

```bash
npm run dev    # node --watch
# or
npm start
```

API: `http://localhost:5000`  
Health: `GET http://localhost:5000/api/status`

Also start the AI service (`ai-service/`) on port **8000** for risk/route analysis.

## Authentication

Roles: `ADMIN` | `OPERATOR` | `USER`

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/register` | Public (cannot create `ADMIN`; default `USER`) |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Bearer JWT |

Login response:

```json
{
  "token": "...",
  "user": { "id": "...", "name": "...", "email": "...", "role": "USER" }
}
```

JWT payload: `{ userId, role }`. Header: `Authorization: Bearer <token>`.

## API endpoints

### System

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/status` | Live DB + AI health checks |
| GET | `/api/live` | Snapshot of available data + sources |
| GET | `/api/status/live` | Alias for frontend |

### Incidents

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/incidents` | Public |
| GET | `/api/incidents/:id` | Public |
| POST | `/api/incidents` | Authenticated (`reportedBy` from JWT) |
| PATCH | `/api/incidents/:id` | Authenticated |
| DELETE | `/api/incidents/:id` | ADMIN / OPERATOR |

### Roads

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/roads` | Public |
| GET | `/api/roads/blocked` | Public |
| PATCH | `/api/roads/:id/status` | ADMIN / OPERATOR |

Disaster alerts ≠ confirmed road blockage. Road status is authoritative for blockages.

### Vehicles

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/vehicles` | Public (demo fleet) |
| GET | `/api/vehicles/:vehicleId` | Public |
| PATCH | `/api/vehicles/:vehicleId/location` | ADMIN / OPERATOR |

### Routes

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/routes/plan` | OSRM candidates + GeoJSON geometry |
| POST | `/api/routes/analyze` | OSRM + context → AI evaluation |

Body accepts `origin` / `destination` with `lat` + `lng` or `lon`.

### Weather / SACHET / AI

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/weather?lat=&lng=` | Open-Meteo (also `lon`) |
| GET | `/api/sachet/alerts` | NDMA CAP RSS → structured alerts (`type: potential_hazard`) |
| POST | `/api/ai/risk-analysis` | Proxies to AI `/analyze-risk` |
| POST | `/api/ai/route-analysis` | Proxies to AI `/analyze-routes` |

AI failures return **HTTP 503** — never fake scores.

## Socket.IO

Same HTTP server. Events:

- `incident:new` / `incident:updated`
- `road:blocked` / `road:updated`
- `vehicle:location`
- `live:update`

Connect from the frontend with `VITE_SOCKET_URL=http://localhost:5000`.

## External APIs

| Service | Use |
|---------|-----|
| OSRM | Driving routes (`alternatives=true`) |
| Open-Meteo | Live weather (short cache) |
| SACHET / NDMA RSS | Hazard alerts (no fabricated coordinates) |
| Python AI (`AI_SERVICE_URL`) | Rule-based risk & route scoring |

## CORS

Uses `CORS_ORIGIN` (default `http://localhost:5173`). Not `origin: *` with credentials.

## Error shape

```json
{ "error": "message" }
```

Status codes: `400`, `401`, `403`, `404`, `409`, `500`, `503`.
