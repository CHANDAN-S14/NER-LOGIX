import { AppError } from '../middleware/errorMiddleware.js';
import { assertValidCoords } from '../utils/validation.js';

const DEFAULT_OSRM =
  'https://router.project-osrm.org/route/v1/driving';

function osrmBase() {
  return (process.env.OSRM_URL || DEFAULT_OSRM).replace(/\/+$/, '');
}

/**
 * Decode Google-encoded polyline to [lng, lat] pairs (GeoJSON order).
 */
function decodePolyline(encoded) {
  if (!encoded || typeof encoded !== 'string') return [];

  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const coordinates = [];

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}

function polylineToGeoJSON(encoded) {
  const coordinates = decodePolyline(encoded);
  return {
    type: 'LineString',
    coordinates,
  };
}

/**
 * Normalize one OSRM route into a frontend-friendly candidate.
 */
function normalizeRoute(route, index) {
  const geometry =
    typeof route.geometry === 'string'
      ? polylineToGeoJSON(route.geometry)
      : route.geometry;

  const steps = (route.legs || []).flatMap((leg) =>
    (leg.steps || []).map((step) => ({
      distance: step.distance,
      duration: step.duration,
      name: step.name,
      mode: step.mode,
      maneuver: step.maneuver
        ? {
            type: step.maneuver.type,
            modifier: step.maneuver.modifier,
            location: step.maneuver.location,
            instruction: step.maneuver.instruction || null,
          }
        : null,
    }))
  );

  return {
    id: `route-${index + 1}`,
    distance: route.distance,
    duration: route.duration,
    geometry,
    legs: (route.legs || []).map((leg) => ({
      distance: leg.distance,
      duration: leg.duration,
      summary: leg.summary,
      steps: leg.steps || [],
    })),
    steps,
    weight: route.weight ?? null,
    weightName: route.weight_name ?? null,
  };
}

/**
 * Plan driving routes via OSRM.
 * Request alternatives when available; return 1..N real candidates.
 */
export async function planRoute(origin, destination) {
  const from = assertValidCoords(origin.lat, origin.lng ?? origin.lon, 'Origin');
  const to = assertValidCoords(
    destination.lat,
    destination.lng ?? destination.lon,
    'Destination'
  );

  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url =
    `${osrmBase()}/${coords}` +
    `?overview=full&geometries=polyline&steps=true&alternatives=true`;

  let res;
  try {
    res = await fetch(url, { method: 'GET' });
  } catch (err) {
    throw new AppError(`OSRM unreachable: ${err.message}`, 503);
  }

  const data = await res.json().catch(() => null);

  if (!res.ok || !data || data.code !== 'Ok' || !Array.isArray(data.routes)) {
    const msg =
      data?.message ||
      data?.code ||
      `OSRM routing failed (${res.status})`;
    throw new AppError(String(msg), res.status === 404 ? 404 : 502);
  }

  if (data.routes.length === 0) {
    throw new AppError('No route found between the given points', 404);
  }

  const routes = data.routes.map((r, i) => normalizeRoute(r, i));

  // Label fastest / shortest from actual OSRM metrics (not AI)
  const fastestId = [...routes].sort((a, b) => a.duration - b.duration)[0]?.id;
  const shortestId = [...routes].sort((a, b) => a.distance - b.distance)[0]?.id;

  const labeled = routes.map((r) => {
    const labels = [];
    if (r.id === fastestId) labels.push('FASTEST');
    if (r.id === shortestId) labels.push('SHORTEST');
    return { ...r, labels };
  });

  return {
    origin: from,
    destination: to,
    routes: labeled,
    waypoints: data.waypoints || [],
    source: 'osrm',
  };
}

export default { planRoute, decodePolyline, polylineToGeoJSON };
