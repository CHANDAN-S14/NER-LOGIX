import { AppError } from '../middleware/errorMiddleware.js';

/**
 * Extract latitude/longitude from common frontend shapes.
 * Accepts lat/lng, lat/lon, latitude/longitude.
 */
export function extractCoords(obj = {}) {
  if (!obj || typeof obj !== 'object') return null;

  const lat = obj.lat ?? obj.latitude;
  const lng = obj.lng ?? obj.lon ?? obj.longitude;

  if (lat == null || lng == null) return null;

  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { lat: latitude, lng: longitude };
}

export function assertValidCoords(lat, lng, label = 'Coordinates') {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new AppError(`${label} must be numeric`, 400);
  }
  if (latitude < -90 || latitude > 90) {
    throw new AppError(`${label}: latitude must be between -90 and 90`, 400);
  }
  if (longitude < -180 || longitude > 180) {
    throw new AppError(`${label}: longitude must be between -180 and 180`, 400);
  }

  return { lat: latitude, lng: longitude };
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function assertEmail(email) {
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    throw new AppError('Valid email is required', 400);
  }
  return email.trim().toLowerCase();
}

export function assertPassword(password) {
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }
  return password;
}

export function assertEnum(value, allowed, fieldName) {
  if (!allowed.includes(value)) {
    throw new AppError(
      `Invalid ${fieldName}. Allowed: ${allowed.join(', ')}`,
      400
    );
  }
  return value;
}

export default {
  extractCoords,
  assertValidCoords,
  assertEmail,
  assertPassword,
  assertEnum,
};
