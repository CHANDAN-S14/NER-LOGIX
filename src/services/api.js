import { API_URL } from './config';

/**
 * Low-level fetch wrapper. Throws ApiError on failure.
 */
async function request(path, options = {}) {
  if (!API_URL) {
    throw new ApiError('API URL not configured (VITE_API_URL)', 0, 'CONFIG');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (err) {
    throw new ApiError(
      err?.message || 'Unable to reach backend',
      0,
      'NETWORK'
    );
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const message =
      (body && typeof body === 'object' && (body.message || body.error)) ||
      `Request failed (${response.status})`;
    throw new ApiError(message, response.status, 'HTTP', body);
  }

  return body;
}

export class ApiError extends Error {
  constructor(message, status = 0, code = 'ERROR', details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ─── System ─────────────────────────────────────────────
export async function getStatus() {
  return request('/api/status');
}

export async function getLiveData() {
  return request('/api/status/live');
}

// ─── Incidents ──────────────────────────────────────────
export async function getIncidents(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/incidents${qs ? `?${qs}` : ''}`);
}

export async function createIncident(payload) {
  return request('/api/incidents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateIncident(id, payload) {
  return request(`/api/incidents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ─── Roads / Blockages ──────────────────────────────────
export async function getRoads(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/roads${qs ? `?${qs}` : ''}`);
}

export async function getBlockedRoads() {
  return request('/api/roads/blocked');
}

// ─── Vehicles ───────────────────────────────────────────
export async function getVehicles() {
  return request('/api/vehicles');
}

// ─── Routes ─────────────────────────────────────────────
export async function planRoute(payload) {
  return request('/api/routes/plan', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function analyzeRoutes(payload) {
  return request('/api/ai/route-analysis', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── AI Risk ────────────────────────────────────────────
export async function analyzeRisk(payload) {
  return request('/api/ai/risk-analysis', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Weather (via backend proxy → Open-Meteo) ───────────
export async function getWeather(lat, lon) {
  const qs = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
  }).toString();
  return request(`/api/weather?${qs}`);
}

// ─── SACHET / NDMA ──────────────────────────────────────
export async function getSachetAlerts(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/sachet/alerts${qs ? `?${qs}` : ''}`);
}

export default {
  getStatus,
  getLiveData,
  getIncidents,
  createIncident,
  updateIncident,
  getRoads,
  getBlockedRoads,
  getVehicles,
  planRoute,
  analyzeRoutes,
  analyzeRisk,
  getWeather,
  getSachetAlerts,
  ApiError,
};