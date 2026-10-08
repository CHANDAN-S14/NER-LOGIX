import { AppError } from '../middleware/errorMiddleware.js';
import { assertValidCoords } from '../utils/validation.js';

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';

/** Simple in-memory cache: key → { expires, data } */
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function weatherCodeToLabel(code) {
  if (code == null) return null;
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

/**
 * Fetch live weather from Open-Meteo. Never hardcodes values.
 */
export async function getWeather(lat, lng) {
  const coords = assertValidCoords(lat, lng, 'Weather location');
  const cacheKey = `${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}`;

  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return { ...cached.data, cached: true };
  }

  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lng),
    current:
      'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,visibility',
    timezone: 'Asia/Kolkata',
  });

  let res;
  try {
    res = await fetch(`${OPEN_METEO}?${params}`);
  } catch (err) {
    throw new AppError(`Weather service unreachable: ${err.message}`, 503);
  }

  if (!res.ok) {
    throw new AppError(`Open-Meteo request failed (${res.status})`, 502);
  }

  const raw = await res.json();
  const current = raw?.current;
  if (!current) {
    throw new AppError('Open-Meteo returned no current weather', 502);
  }

  const visibilityKm =
    current.visibility != null ? Number(current.visibility) / 1000 : null;

  const data = {
    temperature: current.temperature_2m ?? null,
    feelsLike: current.apparent_temperature ?? null,
    rainfall: current.precipitation ?? null,
    wind: current.wind_speed_10m ?? null,
    humidity: current.relative_humidity_2m ?? null,
    visibility: visibilityKm,
    condition: weatherCodeToLabel(current.weather_code),
    weatherCode: current.weather_code ?? null,
    latitude: coords.lat,
    longitude: coords.lng,
    source: 'open-meteo',
    fetchedAt: new Date().toISOString(),
    cached: false,
  };

  cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, data });
  return data;
}

export default { getWeather, weatherCodeToLabel };
