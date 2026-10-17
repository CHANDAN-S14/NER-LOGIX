/** Haversine distance in meters */
export function distanceMeters(a, b) {
  if (!a || !b) return null;

  const [lat1, lon1] = a;
  const [lat2, lon2] = b;

  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Convert a location to [latitude, longitude] */
export function coordsFromLocation(loc) {
  if (!loc) return null;

  if (Array.isArray(loc) && loc.length >= 2) {
    const lat = Number(loc[0]);
    const lon = Number(loc[1]);

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lon) <= 180
    ) {
      return [lat, lon];
    }

    return null;
  }

  if (loc.lat != null && (loc.lon != null || loc.lng != null)) {
    const lat = Number(loc.lat);
    const lon = Number(loc.lon ?? loc.lng);

    return Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lon) <= 180
      ? [lat, lon]
      : null;
  }

  if (loc.latitude != null && loc.longitude != null) {
    const lat = Number(loc.latitude);
    const lon = Number(loc.longitude);

    return Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lon) <= 180
      ? [lat, lon]
      : null;
  }

  return null;
}

/** Decode an encoded Google/OSRM polyline to [latitude, longitude] */
export function decodePolyline(encoded) {
  if (!encoded || typeof encoded !== "string") return [];

  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates = [];

  try {
    while (index < encoded.length) {
      let b;
      let shift = 0;
      let result = 0;

      do {
        if (index >= encoded.length) return [];
        b = encoded.charCodeAt(index++) - 63;
        if (b < 0 || b > 63) return [];

        result |= (b & 0x1f) << shift;
        shift += 5;

        if (shift > 30) return [];
      } while (b >= 0x20);

      const dlat =
        result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        if (index >= encoded.length) return [];
        b = encoded.charCodeAt(index++) - 63;
        if (b < 0 || b > 63) return [];

        result |= (b & 0x1f) << shift;
        shift += 5;

        if (shift > 30) return [];
      } while (b >= 0x20);

      const dlng =
        result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      const point = [lat / 1e5, lng / 1e5];

      if (
        Math.abs(point[0]) > 90 ||
        Math.abs(point[1]) > 180
      ) {
        return [];
      }

      coordinates.push(point);
    }
  } catch {
    return [];
  }

  return coordinates;
}

/**
 * Normalize route geometry into Leaflet format:
 * [[latitude, longitude], ...]
 *
 * Supports:
 * - GeoJSON LineString: [longitude, latitude]
 * - Other GeoJSON geometry objects with coordinates
 * - Encoded polyline strings
 * - Plain coordinate arrays
 */
export function normalizeRouteGeometry(route) {
  if (!route) return [];

  const isValidLatLon = (lat, lon) =>
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180;

  const cleanLatLon = (coordinates) => {
    if (!Array.isArray(coordinates)) return [];

    return coordinates
      .filter(
        (point) =>
          Array.isArray(point) && point.length >= 2
      )
      .map((point) => [
        Number(point[0]),
        Number(point[1]),
      ])
      .filter(([lat, lon]) => isValidLatLon(lat, lon));
  };

  const geometry = route.geometry;

  // GeoJSON uses [longitude, latitude].
  if (
    geometry &&
    typeof geometry === "object" &&
    geometry.type === "LineString" &&
    Array.isArray(geometry.coordinates)
  ) {
    return geometry.coordinates
      .filter(
        (point) =>
          Array.isArray(point) && point.length >= 2
      )
      .map(([lon, lat]) => [
        Number(lat),
        Number(lon),
      ])
      .filter(([lat, lon]) => isValidLatLon(lat, lon));
  }

  // Other GeoJSON geometries with coordinate arrays.
  if (
    geometry &&
    typeof geometry === "object" &&
    Array.isArray(geometry.coordinates)
  ) {
    return geometry.coordinates
      .filter(
        (point) =>
          Array.isArray(point) && point.length >= 2
      )
      .map(([lon, lat]) => [
        Number(lat),
        Number(lon),
      ])
      .filter(([lat, lon]) => isValidLatLon(lat, lon));
  }

  // Encoded polyline.
  if (typeof geometry === "string") {
    return cleanLatLon(decodePolyline(geometry));
  }

  if (typeof route.polyline === "string") {
    return cleanLatLon(decodePolyline(route.polyline));
  }

  // Plain arrays default to [latitude, longitude],
  // unless values clearly indicate [longitude, latitude].
  const coordinates = Array.isArray(geometry)
    ? geometry
    : route.coordinates;

  if (Array.isArray(coordinates)) {
    return coordinates
      .filter(
        (point) =>
          Array.isArray(point) && point.length >= 2
      )
      .map(([first, second]) => {
        const a = Number(first);
        const b = Number(second);

        if (!Number.isFinite(a) || !Number.isFinite(b)) {
          return null;
        }

        // Clearly longitude first, such as [77.36, 12.97].
        if (
          Math.abs(a) > 90 &&
          Math.abs(a) <= 180 &&
          Math.abs(b) <= 90
        ) {
          return [b, a];
        }

        // Otherwise treat as latitude first.
        if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
          return [a, b];
        }

        return null;
      })
      .filter(Boolean);
  }

  return [];
}
