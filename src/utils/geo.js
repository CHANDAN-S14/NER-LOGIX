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

export function normalizeRouteGeometry(route) {
  if (!route) return [];
  if (Array.isArray(route.coordinates)) {
    // [[lat,lon]] or [[lon,lat]] — detect GeoJSON order
    const first = route.coordinates[0];
    if (Array.isArray(first) && first[0] > 50 && first[1] < 50) {
      // likely [lon, lat] GeoJSON
      return route.coordinates.map(([lon, lat]) => [lat, lon]);
    }
    return route.coordinates;
  }
  if (route.geometry?.coordinates) {
    return route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
  }
  if (typeof route.geometry === 'string') return decodePolyline(route.geometry);
  if (typeof route.polyline === 'string') return decodePolyline(route.polyline);
  return [];
}
