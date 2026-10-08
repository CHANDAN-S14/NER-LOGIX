import Incident from '../models/Incident.js';
import Road from '../models/Road.js';
import * as routingService from '../services/routingService.js';
import * as weatherService from '../services/weatherService.js';
import * as aiService from '../services/aiService.js';
import { AppError, asyncHandler } from '../middleware/errorMiddleware.js';
import { extractCoords, assertValidCoords } from '../utils/validation.js';

function parseEndpoints(body) {
  const origin = extractCoords(body.origin || body.from);
  const destination = extractCoords(body.destination || body.to);

  if (!origin) throw new AppError('origin with lat/lng (or lon) is required', 400);
  if (!destination) {
    throw new AppError('destination with lat/lng (or lon) is required', 400);
  }

  assertValidCoords(origin.lat, origin.lng, 'Origin');
  assertValidCoords(destination.lat, destination.lng, 'Destination');

  return { origin, destination };
}

/**
 * POST /api/routes/plan
 * Returns actual OSRM route data (not fabricated).
 */
export const planRoute = asyncHandler(async (req, res) => {
  const { origin, destination } = parseEndpoints(req.body);
  const result = await routingService.planRoute(origin, destination);
  res.json(result);
});

/**
 * POST /api/routes/analyze
 * 1. Generate OSRM candidates
 * 2. Gather roads / incidents / weather
 * 3. Send to AI service
 * 4. Return evaluated routes
 */
export const analyzeRoute = asyncHandler(async (req, res) => {
  const { origin, destination } = parseEndpoints(req.body);

  const planned = await routingService.planRoute(origin, destination);

  // Midpoint weather context (live Open-Meteo — may fail gracefully)
  let weather = null;
  try {
    const midLat = (origin.lat + destination.lat) / 2;
    const midLng = (origin.lng + destination.lng) / 2;
    weather = await weatherService.getWeather(midLat, midLng);
  } catch {
    weather = null;
  }

  const [blockedRoads, openIncidents] = await Promise.all([
    Road.find({ status: { $in: ['blocked', 'restricted'] } }).lean(),
    Incident.find({ status: { $in: ['open', 'verified'] } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
  ]);

  const maxSeverity = (incidents) => {
    const order = { none: 0, low: 1, moderate: 2, high: 3, blocked: 4 };
    let best = 'none';
    for (const i of incidents) {
      const s = String(i.severity || 'none').toLowerCase();
      if ((order[s] || 0) > (order[best] || 0)) best = s;
    }
    return best;
  };

  const corridorBlocked = blockedRoads.length > 0;
  const incidentSeverity = maxSeverity(openIncidents);

  const routePayloads = planned.routes.map((r) => ({
    id: r.id,
    distance: r.distance,
    duration: r.duration,
    blocked: corridorBlocked,
    roadCondition: weather?.rainfall > 5 ? 'wet' : weather?.rainfall > 0 ? 'damp' : 'dry',
    incidentSeverity,
    labels: r.labels || [],
    geometry: r.geometry,
    legs: r.legs,
    steps: r.steps,
  }));

  const aiResult = await aiService.analyzeRoutes({
    routes: routePayloads.map(
      ({ id, distance, duration, blocked, roadCondition, incidentSeverity }) => ({
        id,
        distance,
        duration,
        blocked,
        roadCondition,
        incidentSeverity,
      })
    ),
    weather: weather
      ? {
          rainfall: weather.rainfall ?? 0,
          temperature: weather.temperature ?? 25,
          wind: weather.wind ?? 0,
          visibility: weather.visibility ?? 10,
        }
      : undefined,
    historicalRisk: 50,
  });

  // Merge AI scores onto OSRM geometry (geometry stays from OSRM)
  const aiRoutes = aiResult?.routes || [];
  const byId = new Map(aiRoutes.map((r) => [r.id, r]));

  const merged = planned.routes.map((r) => {
    const evald = byId.get(r.id) || {};
    const labels = [...(r.labels || [])];
    if (
      aiResult?.recommendedRouteId &&
      r.id === aiResult.recommendedRouteId &&
      !labels.includes('SAFEST') &&
      !labels.includes('RECOMMENDED')
    ) {
      labels.push('SAFEST', 'RECOMMENDED');
    }
    return {
      ...r,
      ...evald,
      geometry: r.geometry,
      labels,
    };
  });

  res.json({
    origin,
    destination,
    routes: merged,
    recommendedRouteId: aiResult?.recommendedRouteId || null,
    weather,
    context: {
      blockedRoadCount: blockedRoads.length,
      openIncidentCount: openIncidents.length,
      note: 'SACHET alerts are potential hazards and do not auto-confirm road blockages.',
    },
    source: { routing: 'osrm', ai: 'rule-based' },
  });
});

export default { planRoute, analyzeRoute };
