import { getWeather as fetchWeatherViaApi, ApiError } from './api';
import { API_URL } from './config';

/**
 * Weather service — prefers backend proxy (/api/weather → Open-Meteo).
 * Falls back to direct Open-Meteo only when API URL is unset (local UI dev).
 * Never returns hardcoded values.
 */
const OPEN_METEO =
  'https://api.open-meteo.com/v1/forecast';

function mapOpenMeteo(data) {
  const current = data?.current;
  if (!current) return null;

  const code = current.weather_code;
  return {
    temperature: current.temperature_2m ?? null,
    feelsLike: current.apparent_temperature ?? null,
    humidity: current.relative_humidity_2m ?? null,
    rainfall: current.precipitation ?? null,
    wind: current.wind_speed_10m ?? null,
    visibility: current.visibility != null ? current.visibility / 1000 : null,
    condition: weatherCodeToLabel(code),
    weatherCode: code ?? null,
    source: 'open-meteo',
    fetchedAt: new Date().toISOString(),
  };
}

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

async function fetchOpenMeteoDirect(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,visibility',
    timezone: 'Asia/Kolkata',
  });

  const res = await fetch(`${OPEN_METEO}?${params}`);
  if (!res.ok) throw new ApiError('Open-Meteo request failed', res.status, 'WEATHER');
  const data = await res.json();
  return mapOpenMeteo(data);
}

/**
 * Fetch weather for lat/lon.
 * Uses backend when VITE_API_URL is set; otherwise Open-Meteo direct.
 */
export async function fetchWeather(lat, lon) {
  if (lat == null || lon == null) {
    throw new ApiError('Latitude and longitude required', 0, 'VALIDATION');
  }

  if (API_URL) {
    try {
      const data = await fetchWeatherViaApi(lat, lon);
      // Normalize common backend shapes
      if (data?.current || data?.temperature != null) {
        return {
          temperature: data.temperature ?? data.current?.temperature_2m ?? null,
          feelsLike: data.feelsLike ?? data.feels_like ?? data.current?.apparent_temperature ?? null,
          humidity: data.humidity ?? data.current?.relative_humidity_2m ?? null,
          rainfall: data.rainfall ?? data.precipitation ?? data.current?.precipitation ?? null,
          wind: data.wind ?? data.wind_speed ?? data.current?.wind_speed_10m ?? null,
          visibility: data.visibility ?? null,
          condition: data.condition ?? weatherCodeToLabel(data.weatherCode ?? data.weather_code),
          weatherCode: data.weatherCode ?? data.weather_code ?? null,
          source: data.source || 'backend',
          fetchedAt: data.fetchedAt || new Date().toISOString(),
        };
      }
      return data;
    } catch (err) {
      // If backend weather route is missing, fall back to Open-Meteo
      if (err?.status === 404 || err?.code === 'NETWORK') {
        return fetchOpenMeteoDirect(lat, lon);
      }
      throw err;
    }
  }

  return fetchOpenMeteoDirect(lat, lon);
}

export { weatherCodeToLabel };
