import { CloudSun, Crosshair } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import LocationSearch from '../common/LocationSearch';
import Button from '../common/Button';
import Badge from '../common/Badge';
import StatusBanner from '../common/StatusBanner';
import Card, { CardHeader } from '../common/Card';
import useGeolocation from '../../hooks/useGeolocation';
import {
  formatTemp,
  formatWind,
  formatRain,
  formatVisibility,
  formatHumidity,
} from '../../utils/format';

export default function WeatherPanel() {
  const {
    weather,
    loadWeather,
    applyGpsLocation,
    applyManualLocation,
    activeLocation,
    locationMode,
  } = useAppData();
  const { requestLocation, loading: gpsLoading, error: gpsError } = useGeolocation();

  const w = weather.status === 'success' ? weather.data : null;

  const rows = w
    ? [
        { label: 'Temperature', value: formatTemp(w.temperature) },
        { label: 'Feels Like', value: formatTemp(w.feelsLike) },
        { label: 'Condition', value: w.condition },
        { label: 'Rainfall', value: formatRain(w.rainfall) },
        { label: 'Wind', value: formatWind(w.wind) },
        { label: 'Humidity', value: formatHumidity(w.humidity) },
        { label: 'Visibility', value: formatVisibility(w.visibility) },
      ].filter((r) => r.value != null)
    : [];

  return (
    <section className="animate-fade-in">
      <Card>
        <CardHeader
          title="Weather"
          subtitle="Open-Meteo · location-based"
          action={
            <Badge variant={w ? 'live' : 'offline'} dot>
              {w ? 'Live' : 'No data'}
            </Badge>
          }
        />

        <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
          <CloudSun className="h-4 w-4 text-brand-600" />
          <span>
            {activeLocation?.label
              ? `Location: ${activeLocation.label}`
              : 'Select a location to fetch weather'}
          </span>
        </div>

        <LocationSearch
          value={locationMode === 'manual' ? activeLocation?.label || '' : ''}
          placeholder="Search location for weather"
          onSelect={(s) => {
            applyManualLocation(s);
            loadWeather(s.lat, s.lon);
          }}
        />

        <Button
          variant="secondary"
          size="sm"
          className="mt-2 w-full"
          loading={gpsLoading}
          onClick={async () => {
            try {
              const pos = await requestLocation();
              await applyGpsLocation(pos);
            } catch {
              /* gpsError */
            }
          }}
        >
          <Crosshair className="h-3.5 w-3.5" />
          Use My Location
        </Button>
        {gpsError && <p className="mt-1 text-[11px] text-danger">{gpsError}</p>}
        {locationMode === 'manual' && (
          <p className="mt-1.5 text-[11px] text-slate-500">
            Manual location active — GPS will not overwrite until Use My Location.
          </p>
        )}

        <div className="mt-4">
          {weather.status === 'loading' && (
            <StatusBanner type="loading" title="Fetching weather…" />
          )}
          {weather.status === 'error' && (
            <StatusBanner type="error" title="Weather unavailable" message={weather.error} />
          )}
          {(weather.status === 'idle' || weather.status === 'empty') && (
            <StatusBanner
              type="empty"
              title="No weather data"
              message="Choose GPS or a searched location."
            />
          )}
          {w && rows.length > 0 && (
            <dl className="grid grid-cols-2 gap-2">
              {rows.map((r) => (
                <div
                  key={r.label}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                >
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {r.label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-bold text-slate-800">{r.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </Card>
    </section>
  );
}
