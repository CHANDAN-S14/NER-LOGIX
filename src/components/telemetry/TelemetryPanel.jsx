import { useEffect, useState } from 'react';

import { useAppData } from '../../context/AppDataContext';
import Badge from '../common/Badge';

import {
  formatTemp,
  formatWind,
  formatRain,
  formatVisibility,
  formatHumidity,
} from '../../utils/format';

import useGeolocation from '../../hooks/useGeolocation';

/* =========================================================
   TELEMETRY CARD
========================================================= */

function TelemetryCard({
  label,
  value,
  hint,
  tone = 'default',
}) {
  const toneClass =
    tone === 'warn'
      ? 'text-warn'
      : tone === 'danger'
        ? 'text-danger'
        : tone === 'safe'
          ? 'text-safe'
          : 'text-slate-800';

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        {value != null &&
          value !== 'Not connected' &&
          value !== 'Loading…' && (
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-safe" />
          )}
      </div>

      <p
        className={`mt-1 text-sm font-bold ${toneClass}`}
      >
        {value ?? 'Not connected'}
      </p>

      {hint && (
        <p className="mt-0.5 text-[10px] text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}

/* =========================================================
   GPS WAITING SCREEN
========================================================= */

function WaitingForGps() {
  return (
    <section className="animate-fade-in">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Telemetric Live Status
        </h2>

        <Badge
          variant="offline"
          dot
          pulse
        >
          Getting GPS
        </Badge>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-800">
              Getting your location...
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
              Waiting for GPS before loading live telemetry.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   GPS ERROR
========================================================= */

function GpsError({ message }) {
  return (
    <section className="animate-fade-in">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Telemetric Live Status
        </h2>

        <Badge
          variant="offline"
          dot
        >
          GPS Unavailable
        </Badge>
      </div>

      <div className="rounded-xl border border-amber-100 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-slate-800">
          Location unavailable
        </p>

        <p className="mt-1 text-[11px] text-slate-400">
          {message ||
            'Allow location access and refresh the page to load live telemetry.'}
        </p>
      </div>
    </section>
  );
}

/* =========================================================
   TELEMETRY PANEL
========================================================= */

export default function TelemetryPanel() {
  const {
    weather,
    incidents,
    blockages,
    liveVehicles,
    demoFleet,
    isBackendLive,
    vehicles,

    /*
     * This already exists in your AppDataContext
     * and is used elsewhere in your project.
     */
    applyGpsLocation,
  } = useAppData();

  const {
    requestLocation,
    loading: gpsLoading,
    error: gpsError,
  } = useGeolocation();

  const [
    gpsReady,
    setGpsReady,
  ] = useState(false);

  const [
    locationError,
    setLocationError,
  ] = useState('');

  /* =======================================================
     GET GPS AFTER REFRESH
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function initializeGps() {
      try {
        setLocationError('');

        /*
         * Ask browser for the current location.
         */
        const position =
          await requestLocation();

        if (cancelled) {
          return;
        }

        if (
          !position ||
          !Number.isFinite(
            Number(position.lat)
          ) ||
          !Number.isFinite(
            Number(position.lon)
          )
        ) {
          throw new Error(
            'Invalid GPS coordinates received.'
          );
        }

        /*
         * Send GPS location to AppDataContext.
         *
         * This allows the existing weather/live
         * data system to use the current location.
         */
        await applyGpsLocation(
          position
        );

        if (cancelled) {
          return;
        }

        /*
         * GPS is ready.
         * Now the telemetry section can render.
         */
        setGpsReady(true);

      } catch (error) {
        console.error(
          '[NER-LOGIX] Telemetry GPS:',
          error
        );

        if (!cancelled) {
          setGpsReady(false);

          setLocationError(
            error?.message ||
              gpsError ||
              'Unable to get your current GPS location.'
          );
        }
      }
    }

    initializeGps();

    return () => {
      cancelled = true;
    };

    /*
     * We intentionally run this once when
     * TelemetryPanel mounts after page refresh.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =======================================================
     WAIT FOR GPS
  ======================================================= */

  if (
    !gpsReady &&
    (gpsLoading || !locationError)
  ) {
    return <WaitingForGps />;
  }

  /* =======================================================
     GPS FAILED
  ======================================================= */

  if (!gpsReady) {
    return (
      <GpsError
        message={
          locationError ||
          gpsError
        }
      />
    );
  }

  /* =======================================================
     WEATHER
  ======================================================= */

  const w =
    weather.status === 'success'
      ? weather.data
      : null;

  /* =======================================================
     INCIDENTS
  ======================================================= */

  const activeIncidents =
    incidents.status === 'success' &&
    Array.isArray(incidents.data)
      ? incidents.data.length
      : null;

  /* =======================================================
     BLOCKED ROADS
  ======================================================= */

  const blockedCount =
    blockages.status === 'success' &&
    Array.isArray(blockages.data)
      ? blockages.data.length
      : null;

  /* =======================================================
     LIVE FLEET
  ======================================================= */

  const liveFleetCount =
    vehicles.status === 'success'
      ? liveVehicles.length
      : null;

  /* =======================================================
     CARDS
  ======================================================= */

  const cards = [
    {
      label: 'Temp',

      value: w
        ? formatTemp(w.temperature)
        : weather.status === 'loading'
          ? 'Loading…'
          : null,

      hint: w
        ? 'Live ambient'
        : weather.error ||
          'Open-Meteo',

      tone: 'default',
    },

    {
      label: 'Weather',

      value:
        w?.condition ||
        (
          weather.status ===
          'loading'
            ? 'Loading…'
            : null
        ),

      hint:
        w?.source ||
        null,

      tone: 'default',
    },

    {
      label: 'Visibility',

      value: w
        ? formatVisibility(
            w.visibility
          )
        : weather.status ===
            'loading'
          ? 'Loading…'
          : null,

      hint:
        w?.visibility != null
          ? 'Reported'
          : null,

      tone: 'safe',
    },

    {
      label: 'Rainfall',

      value: w
        ? formatRain(
            w.rainfall
          )
        : weather.status ===
            'loading'
          ? 'Loading…'
          : null,

      hint: w
        ? 'Current'
        : null,

      tone:
        Number(w?.rainfall) > 5
          ? 'warn'
          : 'default',
    },

    {
      label: 'Wind',

      value: w
        ? formatWind(w.wind)
        : weather.status ===
            'loading'
          ? 'Loading…'
          : null,

      hint: w
        ? 'Current'
        : null,

      tone: 'default',
    },

    {
      label: 'Humidity',

      value: w
        ? formatHumidity(
            w.humidity
          )
        : weather.status ===
            'loading'
          ? 'Loading…'
          : null,

      hint: w
        ? 'Current'
        : null,

      tone: 'default',
    },

    {
      label: 'Incidents',

      value:
        activeIncidents != null
          ? String(
              activeIncidents
            ).padStart(2, '0')
          : incidents.status ===
              'loading'
            ? 'Loading…'
            : isBackendLive
              ? '00'
              : null,

      hint:
        incidents.status ===
        'error'
          ? 'Backend error'
          : 'Active reports',

      tone:
        activeIncidents > 0
          ? 'danger'
          : 'default',
    },

    {
      label: 'Blocked',

      value:
        blockedCount != null
          ? String(
              blockedCount
            ).padStart(2, '0')
          : blockages.status ===
              'loading'
            ? 'Loading…'
            : isBackendLive
              ? '00'
              : null,

      hint:
        'Confirmed blockages',

      tone:
        blockedCount > 0
          ? 'danger'
          : 'default',
    },

    {
      label: 'Fleet',

      value:
        liveFleetCount != null
          ? String(
              liveFleetCount
            ).padStart(2, '0')
          : isBackendLive
            ? '00'
            : null,

      hint:
        `${demoFleet.length} demo · labeled separately`,

      tone: 'default',
    },
  ];

  /* =======================================================
     RENDER LIVE TELEMETRY
  ======================================================= */

  return (
    <section className="animate-fade-in">

      {/* HEADER */}

      <div className="mb-3 flex items-center justify-between">

        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Telemetric Live Status
        </h2>

        <Badge
          variant={
            isBackendLive && w
              ? 'live'
              : 'offline'
          }
          dot
          pulse={Boolean(w)}
        >
          {w
            ? 'Live Sensor Grid'
            : 'Waiting for telemetry'}
        </Badge>

      </div>

      {/* TELEMETRY CARDS */}

      <div className="grid grid-cols-3 gap-2">

        {cards.map((card) => (
          <TelemetryCard
            key={card.label}
            {...card}
          />
        ))}

      </div>

    </section>
  );
}