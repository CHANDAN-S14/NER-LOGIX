import { useState } from 'react';
import { Navigation2 } from 'lucide-react';
import NavigationMode from './NavigationMode';
import { useAppData } from '../../context/AppDataContext';
import Badge from '../common/Badge';
import Button from '../common/Button';
import StatusBanner from '../common/StatusBanner';
import {
  formatDistanceKm,
  formatDurationMin,
  formatRiskLabel,
  riskBadgeClasses,
  normalizeRiskLevel,
} from '../../utils/risk';

function categoryLabel(route, index) {
  const cat = (route.category || route.type || route.label || '').toLowerCase();
  if (cat.includes('safe') || cat.includes('recommend')) return 'Recommended Safe';
  if (cat.includes('fast')) return 'Fastest';
  if (cat.includes('short')) return 'Shortest';
  if (route.recommended) return 'Recommended Safe';
  if (index === 0) return 'Option A';
  if (index === 1) return 'Option B';
  return `Option ${String.fromCharCode(65 + index)}`;
}

function riskVariant(level) {
  const n = normalizeRiskLevel(level);
  if (n === 'low') return 'safe';
  if (n === 'moderate') return 'warn';
  if (n === 'high' || n === 'blocked') return 'danger';
  return 'muted';
}

export default function RouteCards() {
const {
  routes,
  selectedRouteId,
  setSelectedRouteId,
  selectedRoute,
  origin,
  destination,
} = useAppData();

const [navigating, setNavigating] =
  useState(false);

  if (navigating && selectedRoute) {
  return (
    <NavigationMode
      route={selectedRoute}

      origin={origin}

      destination={destination}

      mapMode="satellite"

      onExit={() => {
        console.log(
          '[NER-LOGIX] Navigation stopped'
        );

        setNavigating(false);
      }}
    />
  );
}

  if (routes.status === 'idle') {
    return (
      <StatusBanner
        type="empty"
        title="No routes yet"
        message="Set origin and destination, then tap Find Safe Route."
      />
    );
  }

  if (routes.status === 'loading') {
    return (
      <StatusBanner type="loading" title="Calculating corridors…" message="Requesting routes from backend / OSRM." />
    );
  }

  if (routes.status === 'error') {
    return (
      <StatusBanner
        type="error"
        title="Route planning failed"
        message={routes.error || 'Unable to calculate routes'}
      />
    );
  }

  const list = Array.isArray(routes.data) ? routes.data : [];
  if (list.length === 0) {
    return (
      <StatusBanner
        type="empty"
        title="No routes available"
        message="Backend returned no corridor options for this pair."
      />
    );
  }

  const distance =
    selectedRoute &&
    formatDistanceKm(
      selectedRoute.distance ?? selectedRoute.distanceKm ?? selectedRoute.distance_m,
      selectedRoute.distance_m != null ? 'm' : undefined
    );
  const eta =
    selectedRoute &&
    formatDurationMin(
      selectedRoute.duration ?? selectedRoute.durationMin ?? selectedRoute.duration_s ?? selectedRoute.eta,
      selectedRoute.duration_s != null ? 's' : undefined
    );
  const selLevel = selectedRoute?.riskLevel || selectedRoute?.risk_level || selectedRoute?.level;
  const selScore = selectedRoute?.riskScore ?? selectedRoute?.risk_score ?? selectedRoute?.risk;

  return (
    <section className="animate-fade-in space-y-3">
      {selectedRoute && (
        <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                Selected route
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                {distance && <span className="text-lg font-bold text-slate-900">{distance}</span>}
                {eta && <span className="text-sm text-slate-500">{eta}</span>}
              </div>
            </div>
            {selLevel != null && (
              <span
                className={`rounded-lg border px-2 py-1 text-[11px] font-bold ${riskBadgeClasses(selLevel)}`}
              >
                {formatRiskLabel(selLevel)}
                {selScore != null ? ` (${selScore})` : ''}
              </span>
            )}
          </div>
         <Button
  variant="primary"
  size="sm"
  className="mt-3 w-full"
  onClick={() => {
    if (!selectedRoute) {
      console.warn(
        '[NER-LOGIX] No selected route'
      );
      return;
    }

    console.log(
      '[NER-LOGIX] START NAVIGATION',
      selectedRoute
    );

    setNavigating(true);
  }}
>
  <Navigation2 className="h-3.5 w-3.5" />
  Start Nav
</Button>
        </div>
      )}

      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        Route Corridor Options
      </h2>

      <div className="space-y-2">
        {list.map((route, index) => {
          const id = String(route.id || route._id || index);
          const selected = String(selectedRouteId) === id;
          const level = route.riskLevel || route.risk_level || route.level;
          const score = route.riskScore ?? route.risk_score ?? route.risk;
          const dist = formatDistanceKm(
            route.distance ?? route.distanceKm ?? route.distance_m,
            route.distance_m != null ? 'm' : undefined
          );
          const dur = formatDurationMin(
            route.duration ?? route.durationMin ?? route.duration_s ?? route.eta,
            route.duration_s != null ? 's' : undefined
          );
          const reason =
            route.reason ||
            route.recommendation ||
            route.summary ||
            route.roadCondition ||
            route.road_condition;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedRouteId(id)}
              className={`w-full rounded-2xl border p-3 text-left transition-all duration-200 ${
                selected
                  ? 'border-brand-500 bg-white shadow-md ring-2 ring-brand-100'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected ? 'border-brand-600' : 'border-slate-300'
                  }`}
                >
                  {selected && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {categoryLabel(route, index)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {[dist, dur].filter(Boolean).join(' · ') || 'Distance / ETA pending'}
                      </p>
                    </div>
                    {level != null && (
                      <Badge variant={riskVariant(level)}>
                        {score != null ? `Risk ${score} · ` : ''}
                        {formatRiskLabel(level)}
                      </Badge>
                    )}
                  </div>
                  {reason && (
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{reason}</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
