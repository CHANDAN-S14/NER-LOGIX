import { ArrowUpDown, Navigation, Radar, Crosshair } from 'lucide-react';
import LocationSearch from '../common/LocationSearch';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { useAppData } from '../../context/AppDataContext';
import useGeolocation from '../../hooks/useGeolocation';
import { reverseGeocode } from '../../services/geocode';

export default function RoutePlanner() {
  const {
    origin,
    destination,
    setOrigin,
    setDestination,
    findSafeRoute,
    routes,
    applyGpsLocation,
    locationMode,
  } = useAppData();
  const { requestLocation, loading: gpsLoading, error: gpsError } = useGeolocation();

  const swapEnds = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const useMyLocationForOrigin = async () => {
    try {
      const pos = await requestLocation();
      await applyGpsLocation(pos);
      let label = `${pos.lat.toFixed(4)}, ${pos.lon.toFixed(4)}`;
      try {
        const rev = await reverseGeocode(pos.lat, pos.lon);
        if (rev?.label) label = rev.label;
      } catch {
        /* keep coords */
      }
      setOrigin({ lat: pos.lat, lon: pos.lon, label, source: 'gps' });
    } catch {
      /* surfaced via gpsError */
    }
  };

  return (
    <section className="animate-fade-in">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Plan Your Corridor
        </h2>
        <Badge variant={locationMode === 'gps' ? 'live' : locationMode === 'manual' ? 'info' : 'muted'} dot>
          {locationMode === 'gps'
            ? 'GPS'
            : locationMode === 'manual'
              ? 'Manual'
              : 'No location'}
        </Badge>
      </div>

      <div className="relative space-y-2">
        <LocationSearch
          value={origin?.label || ''}
          placeholder="Origin — search or use GPS"
          iconClass="text-brand-600"
          onSelect={(s) =>
            setOrigin({ lat: s.lat, lon: s.lon, label: s.label, source: 'manual' })
          }
          onClear={() => setOrigin(null)}
        />

        <div className="flex justify-center">
          <button
            type="button"
            aria-label="Swap origin and destination"
            onClick={swapEnds}
            className="z-10 -my-1 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-brand-700"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <LocationSearch
          value={destination?.label || ''}
          placeholder="Destination"
          icon={Navigation}
          iconClass="text-danger"
          onSelect={(s) =>
            setDestination({ lat: s.lat, lon: s.lon, label: s.label, source: 'manual' })
          }
          onClear={() => setDestination(null)}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          loading={gpsLoading}
          onClick={useMyLocationForOrigin}
          className="flex-1"
        >
          <Crosshair className="h-3.5 w-3.5" />
          Use My Location
        </Button>
      </div>
      {gpsError && (
        <p className="mt-1.5 text-[11px] text-danger">{gpsError}</p>
      )}
      {locationMode === 'manual' && (
        <p className="mt-1.5 text-[11px] text-slate-500">
          Manual location selected — GPS will not overwrite until you tap Use My Location.
        </p>
      )}

      <Button
        className="mt-4 w-full"
        size="lg"
        loading={routes.status === 'loading'}
        disabled={!origin || !destination}
        onClick={findSafeRoute}
      >
        <Radar className="h-4 w-4" />
        Find Safe Route
      </Button>

      {routes.status === 'error' && (
        <p className="mt-2 text-xs text-danger">{routes.error}</p>
      )}
    </section>
  );
}
