
import { AppError } from '../middleware/errorMiddleware.js';
import { assertValidCoords } from '../utils/validation.js';

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';

// Cache successful weather responses for 10 minutes.
// Keep expired entries temporarily so they can be used during API failures.
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;
const STALE_TTL_MS = 60 * 60 * 1000;

// Prevent concurrent requests for the same coordinates.
const inFlight = new Map();

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

function cachedResponse(entry, stale = false) {
  return {
    ...entry.data,
    cached: true,
    stale,
  };
}

export async function getWeather(lat, lng) {
  const coords = assertValidCoords(lat, lng, 'Weather location');
  const cacheKey =
    `${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}`;

  const now = Date.now();
  const cached = cache.get(cacheKey);

  // Return fresh data without calling Open-Meteo again.
  if (cached && cached.expires > now) {
    return cachedResponse(cached);
  }

  // Share an existing request for the same location.
  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey);
  }

  const request = (async () => {
    const params = new URLSearchParams({
      latitude: String(coords.lat),
      longitude: String(coords.lng),
      current:
        'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,visibility',
      timezone: 'Asia/Kolkata',
    });

    try {
      const res = await fetch(`${OPEN_METEO}?${params}`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        // Use recent cached data if the provider rate-limits us.
        if (
          res.status === 429 &&
          cached &&
          cached.staleUntil > Date.now()
        ) {
          return cachedResponse(cached, true);
        }

        if (res.status === 429) {
          throw new AppError(
            'Weather provider is rate-limiting requests. Please retry shortly.',
            503
          );
        }

        throw new AppError(
          `Open-Meteo request failed (${res.status})`,
          502
        );
      }

      const raw = await res.json();
      const current = raw?.current;

      if (!current) {
        throw new AppError(
          'Open-Meteo returned no current weather',
          502
        );
      }

      const data = {
        temperature: current.temperature_2m ?? null,
        feelsLike: current.apparent_temperature ?? null,
        rainfall: current.precipitation ?? null,
        wind: current.wind_speed_10m ?? null,
        humidity: current.relative_humidity_2m ?? null,
        visibility:
          current.visibility != null
            ? Number(current.visibility) / 1000
            : null,
        condition: weatherCodeToLabel(current.weather_code),
        weatherCode: current.weather_code ?? null,
        latitude: coords.lat,
        longitude: coords.lng,
        source: 'open-meteo',
        fetchedAt: new Date().toISOString(),
        cached: false,
        stale: false,
      };

      cache.set(cacheKey, {
        data,
        expires: Date.now() + CACHE_TTL_MS,
        staleUntil: Date.now() + STALE_TTL_MS,
      });

      return data;
    } catch (err) {
      // On network failures, reuse recently fetched data if possible.
      if (
        cached &&
        cached.staleUntil > Date.now() &&
        !(err instanceof AppError && err.status === 503)
      ) {
        return cachedResponse(cached, true);
      }

      if (err instanceof AppError) {
        throw err;
      }

      throw new AppError(
        'Weather service is temporarily unreachable. Please retry shortly.',
        503
      );
    }
  })();

  inFlight.set(cacheKey, request);

  try {
    return await request;
  } finally {
    inFlight.delete(cacheKey);
  }
}

export default { getWeather, weatherCodeToLabel };
