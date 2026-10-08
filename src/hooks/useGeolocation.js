import { useCallback, useState } from 'react';

/**
 * Browser Geolocation wrapper.
 * Manual location selection must NOT be overwritten — callers decide when to apply GPS.
 */
export default function useGeolocation() {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return Promise.reject(new Error('Geolocation unsupported'));
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            source: 'gps',
            timestamp: pos.timestamp,
          };
          setPosition(next);
          setLoading(false);
          resolve(next);
        },
        (err) => {
          const message =
            err.code === 1
              ? 'Location permission denied'
              : err.code === 2
                ? 'Location unavailable'
                : 'Location request timed out';
          setError(message);
          setLoading(false);
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
      );
    });
  }, []);

  return { position, error, loading, requestLocation };
}
