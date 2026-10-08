import * as aiService from '../services/aiService.js';
import { AppError, asyncHandler } from '../middleware/errorMiddleware.js';

/**
 * Map flexible frontend payloads into the AI RiskRequest shape.
 * Does not invent weather/road values — uses provided fields or sensible typed defaults only where schema requires them.
 */
function buildRiskPayload(body = {}) {
  const weather = body.weather || {};

  return {
    rainfall: Number(
      body.rainfall ?? weather.rainfall ?? weather.precipitation ?? 0
    ),
    temperature: Number(
      body.temperature ?? weather.temperature ?? 25
    ),
    wind: Number(body.wind ?? weather.wind ?? weather.wind_speed ?? 0),
    visibility: Number(
      body.visibility ?? weather.visibility ?? 10
    ),
    roadCondition: String(
      body.roadCondition ?? body.road_condition ?? 'normal'
    ),
    roadBlockage: Boolean(
      body.roadBlockage ?? body.road_blockage ?? false
    ),
    incidentSeverity: String(
      body.incidentSeverity ??
        body.incident_severity ??
        (Array.isArray(body.incidents) && body.incidents.length
          ? body.incidents[0].severity
          : 'none')
    ),
    historicalRisk: Number(body.historicalRisk ?? body.historical_risk ?? 50),
  };
}

/**
 * POST /api/ai/risk-analysis → Python POST /analyze-risk
 * Returns 503 if AI unavailable — never fabricates scores.
 */
export const riskAnalysis = asyncHandler(async (req, res) => {
  const payload = buildRiskPayload(req.body);

  if (
    !Number.isFinite(payload.rainfall) ||
    !Number.isFinite(payload.temperature) ||
    !Number.isFinite(payload.wind) ||
    !Number.isFinite(payload.visibility) ||
    !Number.isFinite(payload.historicalRisk)
  ) {
    throw new AppError('Numeric risk fields must be valid numbers', 400);
  }

  const result = await aiService.analyzeRisk(payload);
  res.json(result);
});

/**
 * POST /api/ai/route-analysis → Python POST /analyze-routes
 */
export const routeAnalysis = asyncHandler(async (req, res) => {
  const body = req.body || {};

  if (!Array.isArray(body.routes) || body.routes.length === 0) {
    throw new AppError('routes array is required', 400);
  }

  const weather = body.weather || {};
  const payload = {
    routes: body.routes.map((r, i) => ({
      id: r.id || `route-${i + 1}`,
      distance: Number(r.distance ?? 0),
      duration: Number(r.duration ?? 0),
      blocked: Boolean(r.blocked ?? false),
      roadCondition: String(r.roadCondition || r.road_condition || 'normal'),
      incidentSeverity: String(
        r.incidentSeverity || r.incident_severity || 'none'
      ),
    })),
    weather: {
      rainfall: Number(weather.rainfall ?? 0),
      temperature: Number(weather.temperature ?? 25),
      wind: Number(weather.wind ?? 0),
      visibility: Number(weather.visibility ?? 10),
    },
    historicalRisk: Number(body.historicalRisk ?? 50),
  };

  const result = await aiService.analyzeRoutes(payload);

  // Preserve original geometry/labels from request when present
  const byId = new Map((result.routes || []).map((r) => [r.id, r]));
  const merged = body.routes.map((orig, i) => {
    const id = orig.id || `route-${i + 1}`;
    const evald = byId.get(id) || {};
    return {
      ...orig,
      ...evald,
      geometry: orig.geometry,
      legs: orig.legs,
      steps: orig.steps,
      labels: orig.labels,
    };
  });

  res.json({
    ...result,
    routes: merged,
  });
});

export default { riskAnalysis, routeAnalysis };
