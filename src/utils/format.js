export function formatNumber(value, digits = 0) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Number(value).toFixed(digits);
}

export function formatTemp(celsius) {
  if (celsius == null) return null;
  return `${Math.round(Number(celsius))}°C`;
}

export function formatWind(kmh) {
  if (kmh == null) return null;
  return `${Math.round(Number(kmh))} km/h`;
}

export function formatRain(mm) {
  if (mm == null) return null;
  return `${Number(mm).toFixed(1)} mm`;
}

export function formatVisibility(km) {
  if (km == null) return null;
  return `${Number(km).toFixed(1)} km`;
}

export function formatHumidity(pct) {
  if (pct == null) return null;
  return `${Math.round(Number(pct))}%`;
}

export function emptyOr(value, fallback = 'Not connected') {
  if (value == null || value === '') return fallback;
  return value;
}

export function capitalize(str) {
  if (!str) return '';
  return String(str).charAt(0).toUpperCase() + String(str).slice(1);
}
