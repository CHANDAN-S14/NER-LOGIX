/**
 * Nominatim geocoding — location search & reverse geocode.
 * Prefer Northeast India bias via viewbox.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org';

/** Approximate NER bounding box */
const NER_VIEWBOX = '88.0,22.0,97.5,29.5'; // left,top,right,bottom for Nominatim

async function nominatimFetch(path, params) {
  const qs = new URLSearchParams({
    format: 'json',
    addressdetails: '1',
    ...params,
  });

  const res = await fetch(`${NOMINATIM}${path}?${qs}`, {
    headers: {
      Accept: 'application/json',
      // Nominatim usage policy requires a valid User-Agent / Referer in browsers
    },
  });

  if (!res.ok) throw new Error('Location search unavailable');
  return res.json();
}

export async function searchLocations(query, { limit = 6 } = {}) {
  if (!query || query.trim().length < 2) return [];

  const results = await nominatimFetch('/search', {
    q: query.trim(),
    limit: String(limit),
    countrycodes: 'in',
    viewbox: NER_VIEWBOX,
    bounded: '0',
  });

  return (results || []).map((r) => ({
    id: String(r.place_id),
    label: r.display_name,
    lat: Number(r.lat),
    lon: Number(r.lon),
    type: r.type,
    importance: r.importance,
  }));
}

export async function reverseGeocode(lat, lon) {
  const result = await nominatimFetch('/reverse', {
    lat: String(lat),
    lon: String(lon),
    zoom: '16',
  });

  if (!result) return null;
  return {
    id: String(result.place_id || `${lat},${lon}`),
    label: result.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    lat: Number(result.lat ?? lat),
    lon: Number(result.lon ?? lon),
  };
}
