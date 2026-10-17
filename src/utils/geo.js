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
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function coordsFromLocation(loc) {
  if (!loc) return null;
  if (Array.isArray(loc) && loc.length >= 2) return [Number(loc[0]), Number(loc[1])];
  if (loc.lat != null && (loc.lon != null || loc.lng != null)) {
    return [Number(loc.lat), Number(loc.lon ?? loc.lng)];
  }
  if (loc.latitude != null && loc.longitude != null) {
    return [Number(loc.latitude), Number(loc.longitude)];
  }
  return null;
}

/** Decode OSRM/polyline geometry if backend returns encoded string */
export function decodePolyline(encoded) {
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

    coordinates.push([lat / 1e5, lng / 1e5]);
  }

  return coordinates;
}


<<<<<<< HEAD
/**
 * Normalize route geometry into Leaflet format:
 * [[latitude, longitude], ...]
 *
 * Supported:
 * 1. route.geometry.coordinates — GeoJSON [longitude, latitude]
 * 2. route.coordinates — [latitude, longitude] by default
 * 3. route.geometry — encoded polyline string
 * 4. route.polyline — encoded polyline string
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

  // GeoJSON always uses [longitude, latitude].
  if (
    route.geometry &&
    typeof route.geometry === 'object' &&
    route.geometry.type === 'LineString' &&
    Array.isArray(route.geometry.coordinates)
  ) {
    return route.geometry.coordinates
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

  // Other GeoJSON geometry objects with coordinates.
  if (
    route.geometry &&
    typeof route.geometry === 'object' &&
    Array.isArray(route.geometry.coordinates)
  ) {
    return route.geometry.coordinates
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

  // Encoded polyline: decodePolyline returns [lat, lon].
  if (typeof route.geometry === 'string') {
    return cleanLatLon(decodePolyline(route.geometry));
  }

  if (typeof route.polyline === 'string') {
    return cleanLatLon(decodePolyline(route.polyline));
  }

  // Plain coordinates default to [lat, lon].
  // Specify the source format explicitly if these are GeoJSON.
  if (Array.isArray(route.coordinates)) {
    return cleanLatLon(route.coordinates);
  }

=======

export function normalizeRouteGeometry(route) {
  if (!route) return [];

  // GeoJSON LineString: [longitude, latitude]
  if (
    route.geometry?.type === 'LineString' &&
    Array.isArray(route.geometry.coordinates)
  ) {
    return route.geometry.coordinates
      .map(([lng, lat]) => [Number(lat), Number(lng)])
      .filter(
        ([lat, lng]) =>
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          Math.abs(lat) <= 90 &&
          Math.abs(lng) <= 180
      );
  }

  // Geometry supplied directly as an array
  const coordinates = Array.isArray(route.geometry)
    ? route.geometry
    : Array.isArray(route.coordinates)
      ? route.coordinates
      : null;

  if (coordinates) {
    return coordinates
      .map((point) => {
        if (!Array.isArray(point) || point.length < 2) return null;

        const a = Number(point[0]);
        const b = Number(point[1]);

        if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

        // Longitude cannot exceed 180; latitude cannot exceed 90.
        if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
          return [b, a];
        }

        if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
          return [a, b];
        }

        return null;
      })
      .filter(Boolean);
  }

  if (typeof route.geometry === 'string') {
    return decodePolyline(route.geometry);
  }

  if (typeof route.polyline === 'string') {
    return decodePolyline(route.polyline);
  }

>>>>>>> 444631e (Fix route analysis and responsive map controls)
  return [];
}

