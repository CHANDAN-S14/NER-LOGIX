import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  ArrowLeft,
  LocateFixed,
  Navigation,
  MapPin,
} from 'lucide-react';

import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  CircleMarker,
  Popup,
  useMap,
} from 'react-leaflet';

import L from 'leaflet';

import { TILE_LAYERS } from '../map/mapLayers';

/* =========================================================
   ROUTE GEOMETRY
   Backend/OSRM: [lng, lat]
   Leaflet:      [lat, lng]
========================================================= */

function normalizeGeometry(route) {
  const geometry = route?.geometry;

  if (Array.isArray(geometry)) {
    return geometry
      .filter(
        (point) =>
          Array.isArray(point) &&
          point.length >= 2 &&
          Number.isFinite(Number(point[0])) &&
          Number.isFinite(Number(point[1]))
      )
      .map(([lng, lat]) => [
        Number(lat),
        Number(lng),
      ]);
  }

  if (
    geometry?.type === 'LineString' &&
    Array.isArray(geometry.coordinates)
  ) {
    return geometry.coordinates
      .filter(
        (point) =>
          Array.isArray(point) &&
          point.length >= 2 &&
          Number.isFinite(Number(point[0])) &&
          Number.isFinite(Number(point[1]))
      )
      .map(([lng, lat]) => [
        Number(lat),
        Number(lng),
      ]);
  }

  return [];
}

/* =========================================================
   MAP FOLLOWER
========================================================= */

function MapFollower({
  position,
  recenterKey,
}) {
  const map = useMap();

  useEffect(() => {
    /*
     * Do NOTHING when GPS position changes.
     *
     * The map should remain wherever the driver
     * has manually panned/zoomed.
     */

    if (!position) return;

    /*
     * Only run when the user explicitly clicks
     * the Recenter button.
     */
    if (!recenterKey) return;

    map.flyTo(
      position,
      16,
      {
        animate: true,
        duration: 0.8,
      }
    );
  }, [map, recenterKey]);

  return null;
}

/* =========================================================
   DISTANCE
========================================================= */

function formatDistance(route) {
  if (!route) return '--';

  /*
   * distanceKm is already kilometres.
   */
  if (route.distanceKm != null) {
    const km = Number(route.distanceKm);

    return Number.isFinite(km)
      ? `${km.toFixed(1)} km`
      : '--';
  }

  /*
   * distance_m is metres.
   */
  if (route.distance_m != null) {
    const km =
      Number(route.distance_m) / 1000;

    return Number.isFinite(km)
      ? `${km.toFixed(1)} km`
      : '--';
  }

  /*
   * OSRM distance is metres.
   */
  if (route.distance != null) {
    const km =
      Number(route.distance) / 1000;

    return Number.isFinite(km)
      ? `${km.toFixed(1)} km`
      : '--';
  }

  return '--';
}

/* =========================================================
   DURATION
========================================================= */

function formatDuration(route) {
  if (!route) return '--';

  let minutes;

  if (route.durationMin != null) {
    minutes = Number(route.durationMin);
  } else if (route.duration_s != null) {
    minutes =
      Number(route.duration_s) / 60;
  } else if (route.duration != null) {
    /*
     * OSRM/backend duration is seconds.
     */
    minutes =
      Number(route.duration) / 60;
  } else if (route.eta != null) {
    minutes = Number(route.eta);
  } else {
    return '--';
  }

  if (!Number.isFinite(minutes)) {
    return '--';
  }

  const rounded =
    Math.max(0, Math.round(minutes));

  const hours =
    Math.floor(rounded / 60);

  const mins =
    rounded % 60;

  if (hours === 0) {
    return `${mins} min`;
  }

  return `${hours} hr ${String(mins).padStart(2, '0')} min`;
}

/* =========================================================
   ROUTE STEPS
========================================================= */

function getSteps(route) {
  if (!Array.isArray(route?.steps)) {
    return [];
  }

  return route.steps.filter(Boolean);
}

function getStepText(step) {
  if (!step) {
    return 'Start driving';
  }

  if (step.maneuver?.instruction) {
    return step.maneuver.instruction;
  }

  if (step.name) {
    return `Continue on ${step.name}`;
  }

  const type =
    step.maneuver?.type || '';

  const modifier =
    step.maneuver?.modifier || '';

  if (type === 'arrive') {
    return 'You have arrived';
  }

  if (type === 'depart') {
    return 'Start driving';
  }

  if (modifier) {
    return `${type || 'Continue'} ${modifier}`;
  }

  return 'Continue on the route';
}

function getStepLocation(step) {
  const location =
    step?.maneuver?.location;

  if (
    !Array.isArray(location) ||
    location.length < 2
  ) {
    return null;
  }

  const lng = Number(location[0]);
  const lat = Number(location[1]);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }

  return [lat, lng];
}

/* =========================================================
   NEARBY PLACES
   OpenStreetMap / Overpass
========================================================= */

const NEARBY_RADIUS_METERS = 5000;
const NEARBY_REFRESH_DISTANCE_METERS = 500;

const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

function haversineDistance(
  lat1,
  lon1,
  lat2,
  lon2
) {
  const R = 6371000;

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLon =
    ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return (
    R *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}

function getNearbyPlaceType(tags = {}) {
  /*
   * Petrol
   */
  if (tags.amenity === 'fuel') {
    return 'fuel';
  }

  /*
   * Food
   */
  if (
    tags.amenity === 'restaurant' ||
    tags.amenity === 'fast_food' ||
    tags.amenity === 'cafe' ||
    tags.amenity === 'food_court'
  ) {
    return 'food';
  }

  /*
   * Stores
   */
  if (
    tags.shop === 'supermarket' ||
    tags.shop === 'convenience' ||
    tags.shop === 'general'
  ) {
    return 'store';
  }

  return null;
}

function getNearbyPlaceIcon(type) {
  if (type === 'fuel') {
    return '⛽';
  }

  if (type === 'food') {
    return '🍴';
  }

  return '🏪';
}

function getNearbyPlaceLabel(type) {
  if (type === 'fuel') {
    return 'Petrol';
  }

  if (type === 'food') {
    return 'Food';
  }

  return 'Store';
}

/* =========================================================
   CUSTOM NEARBY MAP ICON
========================================================= */

function createNearbyIcon(type) {
  const config = {
    fuel: {
      emoji: '⛽',
      background: '#f59e0b',
    },

    food: {
      emoji: '🍴',
      background: '#f97316',
    },

    store: {
      emoji: '🏪',
      background: '#2563eb',
    },
  };

  const item =
    config[type] || config.store;

  return L.divIcon({
    className:
      'ner-logix-nearby-marker',

    html: `
      <div
        style="
          width:34px;
          height:34px;
          border-radius:50%;
          background:${item.background};
          border:3px solid #ffffff;
          box-shadow:0 2px 9px rgba(0,0,0,0.38);
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:17px;
          line-height:1;
        "
      >
        ${item.emoji}
      </div>
    `,

    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

/* =========================================================
   FETCH REAL NEARBY PLACES
========================================================= */

async function fetchNearbyPlaces(
  lat,
  lon
) {
  const query = `
    [out:json][timeout:20];

    (
      nwr["amenity"="fuel"]
        (around:${NEARBY_RADIUS_METERS},${lat},${lon});

      nwr["amenity"="restaurant"]
        (around:${NEARBY_RADIUS_METERS},${lat},${lon});

      nwr["amenity"="fast_food"]
        (around:${NEARBY_RADIUS_METERS},${lat},${lon});

      nwr["amenity"="cafe"]
        (around:${NEARBY_RADIUS_METERS},${lat},${lon});

      nwr["amenity"="food_court"]
        (around:${NEARBY_RADIUS_METERS},${lat},${lon});

      nwr["shop"="supermarket"]
        (around:${NEARBY_RADIUS_METERS},${lat},${lon});

      nwr["shop"="convenience"]
        (around:${NEARBY_RADIUS_METERS},${lat},${lon});

      nwr["shop"="general"]
        (around:${NEARBY_RADIUS_METERS},${lat},${lon});
    );

    out center tags;
  `;

  let lastError = null;

  /*
   * Try multiple Overpass servers.
   */
  for (
    const server of OVERPASS_SERVERS
  ) {
    try {
      const response =
        await fetch(server, {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded;charset=UTF-8',
          },

          body:
            `data=${encodeURIComponent(query)}`,
        });

      if (!response.ok) {
        throw new Error(
          `Overpass request failed: ${response.status}`
        );
      }

      const data =
        await response.json();

      const places = [];

      for (
        const element of
          data.elements || []
      ) {
        const tags =
          element.tags || {};

        const type =
          getNearbyPlaceType(tags);

        if (!type) {
          continue;
        }

        /*
         * Nodes have lat/lon.
         * Ways/relations returned with
         * `center` have center.lat/center.lon.
         */
        const placeLat =
          element.lat ??
          element.center?.lat;

        const placeLon =
          element.lon ??
          element.center?.lon;

        if (
          !Number.isFinite(
            Number(placeLat)
          ) ||
          !Number.isFinite(
            Number(placeLon)
          )
        ) {
          continue;
        }

        const distance =
          haversineDistance(
            lat,
            lon,
            Number(placeLat),
            Number(placeLon)
          );

        places.push({
          id:
            `osm-${element.type}-${element.id}`,

          name:
            tags.name ||
            getNearbyPlaceLabel(type),

          type,

          label:
            getNearbyPlaceLabel(type),

          icon:
            getNearbyPlaceIcon(type),

          lat:
            Number(placeLat),

          lon:
            Number(placeLon),

          distance,

          source:
            'OpenStreetMap',
        });
      }

      /*
       * Remove duplicates.
       */
      const unique =
        Array.from(
          new Map(
            places.map(
              (place) => [
                place.id,
                place,
              ]
            )
          ).values()
        );

      /*
       * Nearest first.
       */
      return unique
        .sort(
          (a, b) =>
            a.distance -
            b.distance
        )
        .slice(0, 40);

    } catch (error) {
      lastError = error;

      console.warn(
        '[NER-LOGIX] Nearby Overpass server failed:',
        server,
        error
      );
    }
  }

  throw (
    lastError ||
    new Error(
      'All nearby-place services failed'
    )
  );
}

/* =========================================================
   NAVIGATION COMPONENT
========================================================= */

export default function NavigationMode({
  route,
  origin,
  destination,
  mapMode = 'satellite',
  onExit,
}) {
  /* =======================================================
     STATE
  ======================================================= */

  const [
    currentPosition,
    setCurrentPosition,
  ] = useState(null);

  const [
    locationError,
    setLocationError,
  ] = useState('');

  const [
    currentStepIndex,
    setCurrentStepIndex,
  ] = useState(0);

  const [
    recenterKey,
    setRecenterKey,
  ] = useState(0);

  /* =======================================================
     NEARBY STATE
  ======================================================= */

  const [
    nearbyPlaces,
    setNearbyPlaces,
  ] = useState([]);

  const [
    nearbyLoading,
    setNearbyLoading,
  ] = useState(false);

  const [
    nearbyError,
    setNearbyError,
  ] = useState('');

  const [
    showNearby,
    setShowNearby,
  ] = useState(true);

  const [
    nearbyFilters,
    setNearbyFilters,
  ] = useState({
    fuel: true,
    food: true,
    store: true,
  });

  const [
    lastNearbyPosition,
    setLastNearbyPosition,
  ] = useState(null);

  /* =======================================================
     ROUTE GEOMETRY
  ======================================================= */

  const geometry = useMemo(
    () =>
      normalizeGeometry(route),
    [route]
  );

  /* =======================================================
     ROUTE STEPS
  ======================================================= */

  const steps = useMemo(
    () => getSteps(route),
    [route]
  );

  /* =======================================================
     LIVE GPS
  ======================================================= */

  useEffect(() => {
    if (
      !navigator.geolocation
    ) {
      setLocationError(
        'Live GPS is not supported by this browser.'
      );

      return undefined;
    }

    const watchId =
      navigator.geolocation.watchPosition(
        (position) => {
          const lat =
            position.coords.latitude;

          const lon =
            position.coords.longitude;

          if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lon)
          ) {
            return;
          }

          setCurrentPosition([
            lat,
            lon,
          ]);

          setLocationError('');
        },

        (error) => {
          console.warn(
            '[NER-LOGIX] Navigation GPS:',
            error
          );

          setLocationError(
            'GPS unavailable. Showing planned route.'
          );
        },

        {
          enableHighAccuracy: true,
          maximumAge: 2000,
          timeout: 10000,
        }
      );

    return () => {
      navigator.geolocation.clearWatch(
        watchId
      );
    };
  }, []);

  /* =======================================================
     GPS FALLBACK
  ======================================================= */

  const fallbackPosition =
    currentPosition ||
    (
      origin?.lat != null &&
      origin?.lon != null
        ? [
            Number(origin.lat),
            Number(origin.lon),
          ]
        : geometry[0] || null
    );

  /* =======================================================
     CURRENT STEP
  ======================================================= */

  const currentStep =
    steps[currentStepIndex] ||
    null;

  const nextInstruction =
    getStepText(currentStep);

  /* =======================================================
     AUTOMATICALLY ADVANCE INSTRUCTIONS
  ======================================================= */

  useEffect(() => {
    if (
      !currentPosition ||
      !currentStep
    ) {
      return;
    }

    const target =
      getStepLocation(currentStep);

    if (!target) {
      return;
    }

    const distance =
      haversineDistance(
        currentPosition[0],
        currentPosition[1],
        target[0],
        target[1]
      );

    /*
     * Roughly 150 metres.
     */
    if (
      distance < 150 &&
      currentStepIndex <
        steps.length - 1
    ) {
      setCurrentStepIndex(
        (index) => index + 1
      );
    }
  }, [
    currentPosition,
    currentStep,
    currentStepIndex,
    steps,
  ]);

  /* =======================================================
     LIVE NEARBY PLACES
  ======================================================= */

  useEffect(() => {
    if (!currentPosition) {
      return;
    }

    const [
      lat,
      lon,
    ] = currentPosition;

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon)
    ) {
      return;
    }

    /*
     * Don't call Overpass repeatedly
     * when the driver hasn't moved.
     */
    if (lastNearbyPosition) {
      const moved =
        haversineDistance(
          lastNearbyPosition[0],
          lastNearbyPosition[1],
          lat,
          lon
        );

      if (
        moved <
        NEARBY_REFRESH_DISTANCE_METERS
      ) {
        return;
      }
    }

    let cancelled = false;

    async function loadNearbyPlaces() {
      try {
        setNearbyLoading(true);
        setNearbyError('');

        const places =
          await fetchNearbyPlaces(
            lat,
            lon
          );

        if (cancelled) {
          return;
        }

        setNearbyPlaces(places);

        setLastNearbyPosition([
          lat,
          lon,
        ]);

        console.log(
          '[NER-LOGIX] Nearby places:',
          places
        );

      } catch (error) {
        console.error(
          '[NER-LOGIX] Nearby places error:',
          error
        );

        if (!cancelled) {
          setNearbyError(
            'Nearby places unavailable'
          );
        }

      } finally {
        if (!cancelled) {
          setNearbyLoading(false);
        }
      }
    }

    loadNearbyPlaces();

    return () => {
      cancelled = true;
    };
  }, [
    currentPosition,
    lastNearbyPosition,
  ]);

  /* =======================================================
     MAP TILE
  ======================================================= */

  const tile =
    TILE_LAYERS[mapMode] ||
    TILE_LAYERS.satellite ||
    TILE_LAYERS.standard;

  /* =======================================================
     DESTINATION
  ======================================================= */

  const destinationPoint =
    destination?.lat != null &&
    destination?.lon != null
      ? [
          Number(destination.lat),
          Number(destination.lon),
        ]
      : geometry[
          geometry.length - 1
        ] || null;

  /* =======================================================
     RISK
  ======================================================= */

  const risk =
    String(
      route?.riskLevel ||
        route?.risk_level ||
        'UNKNOWN'
    ).toUpperCase();

  /* =======================================================
     RENDER
  ======================================================= */

  return createPortal(
    <div
      id="ner-logix-navigation"
      className="
        fixed
        inset-0
        z-[999999]
        h-[100dvh]
        w-[100vw]
        overflow-hidden
        bg-black
      "
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        margin: 0,
        padding: 0,
      }}
    >

      {/* ===================================================
          FULL SCREEN MAP
      =================================================== */}

      <div className="absolute inset-0">
        <MapContainer
          center={
            fallbackPosition ||
            geometry[0] ||
            [25.9, 91.9]
          }
          zoom={15}
          zoomControl={false}
          attributionControl
          className="h-full w-full"
          style={{
            width: '100%',
            height: '100%',
          }}
        >

          {/* BASE MAP */}

          <TileLayer
            url={tile.url}
            attribution={
              tile.attribution
            }
            maxZoom={
              tile.maxZoom || 19
            }
          />

          {/* GPS FOLLOW */}

          <MapFollower
            position={
              fallbackPosition
            }
            recenterKey={
              recenterKey
            }
          />

          {/* =================================================
              ROUTE OUTLINE
          ================================================= */}

          {geometry.length > 1 && (
            <Polyline
              positions={geometry}
              pathOptions={{
                color: '#ffffff',
                weight: 9,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          )}

          {/* =================================================
              MAIN ROUTE
          ================================================= */}

          {geometry.length > 1 && (
            <Polyline
              positions={geometry}
              pathOptions={{
                color: '#2563eb',
                weight: 5,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          )}

          {/* =================================================
              DRIVER LOCATION
          ================================================= */}

          {fallbackPosition && (
            <CircleMarker
              center={
                fallbackPosition
              }
              radius={8}
              pathOptions={{
                color: '#ffffff',
                weight: 3,
                fillColor: '#2563eb',
                fillOpacity: 1,
              }}
            />
          )}

          {/* =================================================
              DESTINATION
          ================================================= */}

          {destinationPoint && (
            <Marker
              position={
                destinationPoint
              }
            />
          )}

          {/* =================================================
              ROUTE STEP POINTS
          ================================================= */}

          {steps.map(
            (step, index) => {
              const point =
                getStepLocation(
                  step
                );

              if (!point) {
                return null;
              }

              return (
                <CircleMarker
                  key={`step-${index}`}
                  center={point}
                  radius={2.5}
                  pathOptions={{
                    color: '#ffffff',
                    weight: 1,

                    fillColor:
                      index ===
                      currentStepIndex
                        ? '#f59e0b'
                        : '#64748b',

                    fillOpacity: 0.9,
                  }}
                />
              );
            }
          )}

          {/* =================================================
              NEARBY PETROL / FOOD / STORE
          ================================================= */}

          {showNearby &&
            nearbyPlaces
              .filter(
                (place) =>
                  nearbyFilters[
                    place.type
                  ]
              )
              .map((place) => (
                <Marker
                  key={place.id}
                  position={[
                    place.lat,
                    place.lon,
                  ]}
                  icon={createNearbyIcon(
                    place.type
                  )}
                >
                  <Popup>
                    <div className="min-w-[180px]">

                      <div className="flex items-center gap-2">

                        <span className="text-xl">
                          {place.icon}
                        </span>

                        <div className="min-w-0">
                          <p className="font-bold text-slate-900">
                            {place.name}
                          </p>

                          <p className="text-xs text-slate-500">
                            {place.label}
                          </p>
                        </div>

                      </div>

                      <div className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5">
                        <p className="text-xs font-semibold text-slate-700">
                          {place.distance <
                          1000
                            ? `${Math.round(
                                place.distance
                              )} m away`
                            : `${(
                                place.distance /
                                1000
                              ).toFixed(
                                1
                              )} km away`}
                        </p>
                      </div>

                      <p className="mt-2 text-[10px] text-slate-400">
                        Source:
                        OpenStreetMap
                      </p>

                    </div>
                  </Popup>
                </Marker>
              ))}

        </MapContainer>
      </div>

      {/* ===================================================
          TOP BAR
      =================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          left-0
          right-0
          top-0
          z-[10000]
          p-3
        "
      >

        <div className="
          flex
          items-start
          justify-between
        ">

          {/* EXIT */}

          <button
            type="button"
            onClick={onExit}
            className="
              pointer-events-auto
              flex
              items-center
              gap-1.5
              rounded-full
              bg-white/95
              px-3
              py-2
              text-xs
              font-semibold
              text-slate-800
              shadow-lg
              backdrop-blur
            "
          >
            <ArrowLeft
              size={15}
            />

            Exit
          </button>

          {/* RIGHT CONTROLS */}

          <div className="
            flex
            flex-col
            items-end
          ">

            {/* LIVE NAV */}

            <div
              className="
                pointer-events-auto
                flex
                items-center
                gap-1.5
                rounded-full
                bg-white/95
                px-3
                py-2
                text-[10px]
                font-bold
                text-emerald-700
                shadow-lg
                backdrop-blur
              "
            >

              <span
                className="
                  h-2
                  w-2
                  animate-pulse
                  rounded-full
                  bg-emerald-500
                "
              />

              LIVE NAV
            </div>

            {/* NEARBY BUTTON */}

            <button
              type="button"
              onClick={() =>
                setShowNearby(
                  (value) => !value
                )
              }
              className="
                pointer-events-auto
                mt-2
                rounded-full
                bg-white/95
                px-3
                py-2
                text-[10px]
                font-bold
                text-slate-700
                shadow-lg
                backdrop-blur
              "
            >
              📍 Nearby
            </button>

            {/* FILTERS */}

            {showNearby && (
              <div
                className="
                  pointer-events-auto
                  mt-2
                  flex
                  gap-1
                  rounded-xl
                  bg-white/95
                  p-1.5
                  shadow-lg
                  backdrop-blur
                "
              >

                {/* PETROL */}

                <button
                  type="button"
                  onClick={() =>
                    setNearbyFilters(
                      (previous) => ({
                        ...previous,
                        fuel:
                          !previous.fuel,
                      })
                    )
                  }
                  className={`
                    rounded-lg
                    px-2
                    py-1
                    text-[9px]
                    font-semibold
                    ${
                      nearbyFilters.fuel
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-400'
                    }
                  `}
                >
                  ⛽ Petrol
                </button>

                {/* FOOD */}

                <button
                  type="button"
                  onClick={() =>
                    setNearbyFilters(
                      (previous) => ({
                        ...previous,
                        food:
                          !previous.food,
                      })
                    )
                  }
                  className={`
                    rounded-lg
                    px-2
                    py-1
                    text-[9px]
                    font-semibold
                    ${
                      nearbyFilters.food
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-slate-100 text-slate-400'
                    }
                  `}
                >
                  🍴 Food
                </button>

                {/* STORE */}

                <button
                  type="button"
                  onClick={() =>
                    setNearbyFilters(
                      (previous) => ({
                        ...previous,
                        store:
                          !previous.store,
                      })
                    )
                  }
                  className={`
                    rounded-lg
                    px-2
                    py-1
                    text-[9px]
                    font-semibold
                    ${
                      nearbyFilters.store
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-400'
                    }
                  `}
                >
                  🏪 Store
                </button>

              </div>
            )}

            {/* NEARBY STATUS */}

            {showNearby && (
              <div
                className="
                  pointer-events-auto
                  mt-1
                  rounded-full
                  bg-white/90
                  px-2.5
                  py-1
                  text-center
                  text-[9px]
                  font-medium
                  text-slate-500
                  shadow
                "
              >

                {nearbyLoading
                  ? 'Finding nearby places...'
                  : nearbyError
                    ? nearbyError
                    : nearbyPlaces.length >
                        0
                      ? `${nearbyPlaces.length} nearby places`
                      : 'No mapped places within 5 km'}

              </div>
            )}

          </div>

        </div>
      </div>

      {/* ===================================================
          NEXT INSTRUCTION
      =================================================== */}

      <div
        className="
          absolute
          left-3
          top-[72px]
          z-[10000]
          w-[285px]
          max-w-[calc(100vw-24px)]
        "
      >

        <div
          className="
            flex
            items-center
            gap-2.5
            rounded-2xl
            bg-white/95
            px-3
            py-2.5
            shadow-lg
            backdrop-blur
          "
        >

          {/* ICON */}

          <div
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-blue-600
              text-white
            "
          >
            <Navigation
              size={19}
            />
          </div>

          {/* TEXT */}

          <div className="min-w-0">

            <p
              className="
                text-[8px]
                font-bold
                uppercase
                tracking-wider
                text-slate-400
              "
            >
              Next instruction
            </p>

            <p
              className="
                mt-0.5
                truncate
                text-sm
                font-bold
                leading-tight
                text-slate-900
              "
            >
              {nextInstruction}
            </p>

            {currentStep?.name && (
              <p
                className="
                  mt-0.5
                  truncate
                  text-[10px]
                  text-slate-500
                "
              >
                {currentStep.name}
              </p>
            )}

          </div>

        </div>

      </div>

      {/* ===================================================
          RECENTER BUTTON
      =================================================== */}

<button
  type="button"
  onClick={() => {
    if (!currentPosition) return;

    setRecenterKey(
      (value) => value + 1
    );
  }}
  className="
    absolute
    bottom-[145px]
    right-3
    z-[10000]
    flex
    h-10
    w-10
    items-center
    justify-center
    rounded-full
    bg-white/95
    text-slate-800
    shadow-lg
    backdrop-blur
  "
  title="Recenter"
>
  <LocateFixed
    size={18}
  />
</button>

      {/* ===================================================
          BOTTOM NAVIGATION PANEL
      =================================================== */}

      <div
        className="
          absolute
          bottom-0
          left-0
          w-100
          right-0
          z-[10000]
          p-3
        "
      >

        <div
          className="
            rounded-2xl
            bg-white/95
            p-3
            shadow-xl
            backdrop-blur
          "
        >

          {/* DESTINATION */}

          <div
            className="
              mb-2
              flex
              items-center
              justify-between
              gap-3
            "
          >

            <div className="min-w-0 flex-1">

              <p
                className="
                  text-[8px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-slate-400
                "
              >
                Destination
              </p>

              <p
                className="
                  mt-0.5
                  truncate
                  text-xs
                  font-bold
                  leading-tight
                  text-slate-900
                "
              >
                {destination?.label ||
                  'Destination'}
              </p>

            </div>

            <div
              className="
                flex
                shrink-0
                items-center
                gap-1
                text-[10px]
                font-semibold
                text-emerald-700
              "
            >
              <MapPin
                size={12}
              />

              Active
            </div>

          </div>

          {/* STATS */}

          <div
            className="
              grid
              grid-cols-3
              gap-1.5
            "
          >

            {/* DISTANCE */}

            <div
              className="
                min-w-0
                rounded-xl
                bg-slate-50
                px-2
                py-1.5
              "
            >

              <p
                className="
                  text-[8px]
                  font-semibold
                  uppercase
                  text-slate-400
                "
              >
                Distance
              </p>

              <p
                className="
                  mt-0.5
                  truncate
                  text-sm
                  font-bold
                  leading-tight
                  text-slate-900
                "
              >
                {formatDistance(
                  route
                )}
              </p>

            </div>

            {/* ETA */}

            <div
              className="
                min-w-0
                rounded-xl
                bg-slate-50
                px-2
                py-1.5
              "
            >

              <p
                className="
                  text-[8px]
                  font-semibold
                  uppercase
                  text-slate-400
                "
              >
                ETA
              </p>

              <p
                className="
                  mt-0.5
                  truncate
                  text-sm
                  font-bold
                  leading-tight
                  text-slate-900
                "
              >
                {formatDuration(
                  route
                )}
              </p>

            </div>

            {/* RISK */}

            <div
              className="
                min-w-0
                rounded-xl
                bg-emerald-50
                px-2
                py-1.5
              "
            >

              <p
                className="
                  text-[8px]
                  font-semibold
                  uppercase
                  text-emerald-600
                "
              >
                Risk
              </p>

              <p
                className="
                  mt-0.5
                  truncate
                  text-sm
                  font-bold
                  leading-tight
                  text-emerald-800
                "
              >
                {risk}
              </p>

            </div>

          </div>

          {/* GPS WARNING */}

          {locationError && (
            <p
              className="
                mt-2
                text-center
                text-[9px]
                leading-tight
                text-amber-600
              "
            >
              {locationError}
            </p>
          )}

        </div>

      </div>

    </div>,

    document.body
  );
}