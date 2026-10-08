import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Polygon,
  CircleMarker,
  LayerGroup,
  Tooltip,
  useMap,
} from 'react-leaflet';

import {
  useAppData,
  useMapLayerVisibility,
} from '../../context/AppDataContext';

import {
  TILE_LAYERS,
  SATELLITE_LABEL_LAYER,
  SATELLITE_ROAD_LABEL_LAYER,
} from '../../components/map/mapLayers';

import {
  originIcon,
  destinationIcon,
  vehicleIcon,
  incidentIcon,
  blockageIcon,
} from './markers';

import MapControls from './MapControls';
import MapLegend from './MapLegend';

import {
  normalizeRouteGeometry,
  coordsFromLocation,
} from '../../utils/geo';

import {
  normalizeRiskLevel,
} from '../../utils/risk';

import Badge from '../common/Badge';


/* ============================================================
   SAFE COORDINATE HELPERS
   ============================================================ */

function normalizePoint(point) {
  if (!Array.isArray(point) || point.length < 2) {
    return null;
  }

  const a = Number(point[0]);
  const b = Number(point[1]);

  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return null;
  }

  /*
   * Detect GeoJSON [longitude, latitude].
   */

  if (
    Math.abs(a) > 90 &&
    Math.abs(b) <= 90
  ) {
    return [b, a];
  }

  if (
    Math.abs(b) > 90 &&
    Math.abs(a) <= 90
  ) {
    return [a, b];
  }

  /*
   * Default GeoJSON order:
   * [longitude, latitude]
   */

  return [b, a];
}


function normalizeLineCoordinates(coordinates) {
  if (!Array.isArray(coordinates)) {
    return [];
  }

  return coordinates
    .filter((point) => Array.isArray(point))
    .map(normalizePoint)
    .filter(Boolean);
}


function normalizePolygonCoordinates(coordinates) {
  if (
    !Array.isArray(coordinates) ||
    coordinates.length === 0
  ) {
    return [];
  }

  /*
   * A single coordinate is not a polygon.
   */

  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === 'number'
  ) {
    return [];
  }

  if (Array.isArray(coordinates[0])) {
    const first = coordinates[0];

    /*
     * Polygon ring:
     *
     * [
     *   [lng, lat],
     *   [lng, lat]
     * ]
     */

    if (Array.isArray(first?.[0])) {
      return normalizeLineCoordinates(first);
    }

    return normalizeLineCoordinates(coordinates);
  }

  return [];
}


function getBlockagePolygonCoordinates(blockage) {
  if (!blockage) {
    return [];
  }

  if (blockage.polygon) {
    if (Array.isArray(blockage.polygon)) {
      return normalizePolygonCoordinates(
        blockage.polygon
      );
    }

    if (
      blockage.polygon.type === 'Polygon' &&
      Array.isArray(
        blockage.polygon.coordinates
      )
    ) {
      return normalizePolygonCoordinates(
        blockage.polygon.coordinates
      );
    }
  }

  const geometry = blockage.geometry;

  if (
    !geometry ||
    !Array.isArray(geometry.coordinates)
  ) {
    return [];
  }

  if (geometry.type === 'Polygon') {
    return normalizePolygonCoordinates(
      geometry.coordinates
    );
  }

  return [];
}


/* ============================================================
   MAP HELPERS
   ============================================================ */

function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points?.length) {
      return;
    }

    if (points.length === 1) {
      map.flyTo(
        points[0],
        13,
        {
          duration: 0.6,
        }
      );

      return;
    }

    map.fitBounds(
      points,
      {
        padding: [48, 48],
        maxZoom: 14,
        animate: true,
      }
    );
  }, [map, points]);

  return null;
}


function LayerSwitcher({ layerId }) {
  const map = useMap();

  const layer =
    TILE_LAYERS[layerId] ||
    TILE_LAYERS.standard;

  useEffect(() => {
    map.invalidateSize();
  }, [map, layerId]);

  return (
    <>
    <TileLayer
  key={layer.id}
  url={layer.url}
  attribution={layer.attribution}
  maxZoom={layer.maxZoom || 19}
  noWrap={true}
  bounds={[
    [-85.05112878, -180],
    [85.05112878, 180],
  ]}
/>

      {layerId === 'satellite' && (
        <>
<TileLayer
  url={SATELLITE_LABEL_LAYER.url}
  attribution={SATELLITE_LABEL_LAYER.attribution}
  maxZoom={SATELLITE_LABEL_LAYER.maxZoom}
  noWrap={true}
  bounds={[
    [-85.05112878, -180],
    [85.05112878, 180],
  ]}
  opacity={1}
  zIndex={200}
/>

<TileLayer
  url={SATELLITE_ROAD_LABEL_LAYER.url}
  attribution={SATELLITE_ROAD_LABEL_LAYER.attribution}
  maxZoom={SATELLITE_ROAD_LABEL_LAYER.maxZoom}
  noWrap={true}
  bounds={[
    [-85.05112878, -180],
    [85.05112878, 180],
  ]}
  opacity={1}
  zIndex={201}
/>
        </>
      )}
    </>
  );
}


/* ============================================================
   FAST MAP LAYER VISIBILITY CONTROLLER

   The LayerGroups stay mounted.

   We only add/remove them from Leaflet's map.

   This prevents React from destroying and recreating
   every Marker / Polygon / Polyline when a checkbox changes.
   ============================================================ */

function MapLayerVisibilityController({
  layerRefs,
}) {
  const map = useMap();

  const { mapLayers } =
    useMapLayerVisibility();

  useEffect(() => {
    Object.entries(layerRefs).forEach(
      ([layerId, ref]) => {
        const layer = ref?.current;

        if (!layer) {
          return;
        }

        const shouldShow =
          mapLayers?.[layerId] !== false;

        if (shouldShow) {
          if (!map.hasLayer(layer)) {
            map.addLayer(layer);
          }
        } else {
          if (map.hasLayer(layer)) {
            map.removeLayer(layer);
          }
        }
      }
    );
  }, [
    map,
    mapLayers,
    layerRefs,
  ]);

  return null;
}


/* ============================================================
   ROUTE DISPLAY HELPERS
   ============================================================ */

function getRouteType(route) {
  const value = `${route?.id || ''} ${
    route?.name || ''
  } ${
    route?.title || ''
  } ${
    route?.type || ''
  }`.toLowerCase();

  if (value.includes('safe')) {
    return 'SAFEST';
  }

  if (value.includes('fast')) {
    return 'FASTEST';
  }

  if (value.includes('short')) {
    return 'SHORTEST';
  }

  return 'ROUTE';
}


function formatRouteDistance(distanceKm) {
  const value = Number(distanceKm);

  if (!Number.isFinite(value)) {
    return '';
  }

  return `${value.toFixed(1)} km`;
}


function formatRouteDuration(durationMin) {
  const value = Number(durationMin);

  if (!Number.isFinite(value)) {
    return '';
  }

  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);

  if (hours === 0) {
    return `${minutes} min`;
  }

  return `${hours} hr ${String(minutes).padStart(
    2,
    '0'
  )} min`;
}


function getRouteColor(route, selected) {
  if (selected) {
    return '#2563eb';
  }

  const type = getRouteType(route);

  if (type === 'FASTEST') {
    return '#60a5fa';
  }

  if (type === 'SHORTEST') {
    return '#94a3b8';
  }

  if (type === 'SAFEST') {
    return '#34d399';
  }

  return '#cbd5e1';
}


function getRouteLabel(route) {
  const type = getRouteType(route);

  const distance =
    formatRouteDistance(
      route?.distanceKm
    );

  const duration =
    formatRouteDuration(
      route?.durationMin
    );

  if (distance && duration) {
    return `${type} • ${distance} • ${duration}`;
  }

  return type;
}


/* ============================================================
   LIVE MAP
   ============================================================ */

export default function LiveMap() {
  const {
    mapDefault,
    mapLayer,

    origin,
    destination,

    routes,
    selectedRoute,
    selectedRouteId,

    incidents,
    blockages,
    alerts,

    demoFleet,
    liveVehicles,

    activeLocation,
    risk,

    weather,
  } = useAppData();


  /*
   * Separate context for map layer visibility.
   *
   * Do NOT put this into useAppData().
   */

  useMapLayerVisibility();


  /* ==========================================================
     STABLE LEAFLET LAYER GROUP REFS
     ========================================================== */

  const layerRefs = useRef({
    incidents: null,
    riskZones: null,
    roadStatus: null,
    vehicles: null,
    routes: null,
    weather: null,
  });


  /*
   * Keep the actual LayerGroup references stable.
   */

  const incidentsLayerRef =
    useRef(null);

  const riskZonesLayerRef =
    useRef(null);

  const roadStatusLayerRef =
    useRef(null);

  const vehiclesLayerRef =
    useRef(null);

  const routesLayerRef =
    useRef(null);

  const weatherLayerRef =
    useRef(null);


  const tile =
    TILE_LAYERS[mapLayer] ||
    TILE_LAYERS.standard;


  /* ============================================================
     ROUTES
     ============================================================ */

  const routePolylines = useMemo(() => {
    if (
      routes.status !== 'success' ||
      !Array.isArray(routes.data)
    ) {
      return [];
    }

    return routes.data
      .map((route, idx) => {
        const id = String(
          route.id ||
            route._id ||
            idx
        );

        const coords =
          normalizeRouteGeometry(route);

        const selected =
          String(selectedRouteId) === id;

        return {
          id,

          coords: Array.isArray(coords)
            ? coords.filter(
                (point) =>
                  Array.isArray(point) &&
                  point.length >= 2
              )
            : [],

          color:
            getRouteColor(
              route,
              selected
            ),

          selected,

          weight:
            selected
              ? 7
              : 4,

          opacity:
            selected
              ? 1
              : 0.78,

          route,

          label:
            getRouteLabel(route),
        };
      })
      .filter(
        (route) =>
          route.coords.length > 1
      );
  }, [
    routes,
    selectedRouteId,
  ]);


  /* ============================================================
     FIT MAP
     ============================================================ */

  const fitPoints = useMemo(() => {
    const points = [];

    const originPoint =
      coordsFromLocation(origin);

    const destinationPoint =
      coordsFromLocation(destination);

    if (originPoint) {
      points.push(originPoint);
    }

    if (destinationPoint) {
      points.push(destinationPoint);
    }

    if (selectedRoute) {
      const geometry =
        normalizeRouteGeometry(
          selectedRoute
        );

      if (Array.isArray(geometry)) {
        geometry.forEach((point) => {
          if (
            Array.isArray(point) &&
            point.length >= 2
          ) {
            points.push(point);
          }
        });
      }
    }

    return points;
  }, [
    origin,
    destination,
    selectedRoute,
  ]);


  /* ============================================================
     RISK ZONES
     ============================================================ */

  const riskZones = useMemo(() => {
    const zones = [];

    const analysis =
      risk?.data;


    /*
     * AI risk polygons
     */

    if (
      analysis?.zones &&
      Array.isArray(
        analysis.zones
      )
    ) {
      analysis.zones.forEach(
        (zone, index) => {
          if (
            Array.isArray(
              zone.coordinates
            ) &&
            zone.coordinates.length
          ) {
            const coords =
              normalizePolygonCoordinates(
                zone.coordinates
              );

            if (coords.length) {
              zones.push({
                id: `risk-${index}`,

                coords,

                level:
                  zone.level ||
                  zone.riskLevel,

                label:
                  zone.label ||
                  zone.name,
              });
            }
          }
        }
      );
    }


    /*
     * Confirmed blockage polygons
     */

    if (
      blockages.status === 'success' &&
      Array.isArray(
        blockages.data
      )
    ) {
      blockages.data.forEach(
        (blockage, index) => {
          const coords =
            getBlockagePolygonCoordinates(
              blockage
            );

          if (coords.length) {
            zones.push({
              id: `block-${index}`,

              coords,

              level: 'blocked',

              label:
                blockage.name ||
                blockage.roadName ||
                'Confirmed blockage',

              kind: 'blockage',
            });
          }
        }
      );
    }

    return zones;
  }, [
    risk?.data,
    blockages,
  ]);


  /* ============================================================
     RISK COLORS
     ============================================================ */

  const zoneColor = (level) => {
    const normalized =
      normalizeRiskLevel(level);

    if (
      normalized === 'blocked' ||
      normalized === 'high'
    ) {
      return {
        color: '#dc2626',
        fill: '#ef4444',
      };
    }

    if (
      normalized === 'moderate'
    ) {
      return {
        color: '#d97706',
        fill: '#f59e0b',
      };
    }

    return {
      color: '#059669',
      fill: '#10b981',
    };
  };


  /* ============================================================
     WEATHER
     ============================================================ */

  const weatherData =
    weather?.status === 'success'
      ? weather.data
      : null;


  /*
   * IMPORTANT:
   * No fake weather.
   *
   * The visibility controller decides whether the entire
   * weather LayerGroup is visible.
   */

  const showWeather =
    Boolean(weatherData) &&
    activeLocation?.lat != null &&
    activeLocation?.lon != null;


  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <div className="relative h-full w-full overflow-hidden rounded-none bg-slate-200 lg:rounded-l-none">

<MapContainer
  center={mapDefault.center}
  zoom={mapDefault.zoom}
  minZoom={3}
  maxZoom={19}
  scrollWheelZoom={true}
  zoomControl={false}
  maxBounds={[
    [-85.05112878, -180],
    [85.05112878, 180],
  ]}
  maxBoundsViscosity={1.0}
  worldCopyJump={false}
  className="h-full w-full"
  preferCanvas
>


        {/* ====================================================
            FAST LAYER VISIBILITY
        ==================================================== */}

        <MapLayerVisibilityController
          layerRefs={{
            incidents:
              incidentsLayerRef,

            riskZones:
              riskZonesLayerRef,

            roadStatus:
              roadStatusLayerRef,

            vehicles:
              vehiclesLayerRef,

            routes:
              routesLayerRef,

            weather:
              weatherLayerRef,
          }}
        />


        {/* ====================================================
            BASE MAP
        ==================================================== */}

        <LayerSwitcher
          layerId={tile.id}
        />


        {/* ====================================================
            MAP CONTROLS
        ==================================================== */}

        <MapControls />


        {/* ====================================================
            FIT MAP
        ==================================================== */}

        {fitPoints.length > 0 && (
          <FitBounds
            points={fitPoints}
          />
        )}


        {/* ====================================================
            RISK / BLOCKAGE POLYGONS

            IMPORTANT:
            Always mounted.
            Visibility is controlled by Leaflet LayerGroup.
        ==================================================== */}

        <LayerGroup
          ref={riskZonesLayerRef}
        >

          {riskZones.map((zone) => {
            const colors =
              zoneColor(
                zone.level
              );

            return (
              <Polygon
                key={zone.id}
                positions={zone.coords}
                pathOptions={{
                  color:
                    colors.color,

                  fillColor:
                    colors.fill,

                  fillOpacity:
                    0.22,

                  weight: 2,

                  dashArray:
                    zone.kind ===
                    'blockage'
                      ? null
                      : '4 6',
                }}
              >

                {zone.label && (
                  <Popup>

                    <strong>
                      {zone.label}
                    </strong>

                    {zone.kind ===
                      'blockage' && (
                      <div>

                        <Badge
                          variant="danger"
                          className="mt-1"
                        >
                          CONFIRMED BLOCKAGE
                        </Badge>

                      </div>
                    )}

                  </Popup>
                )}

              </Polygon>
            );
          })}

        </LayerGroup>


        {/* ====================================================
            ROUTES

            SAFEST  = green
            FASTEST = blue
            SHORTEST = grey
            SELECTED = bright blue
        ==================================================== */}

        <LayerGroup
          ref={routesLayerRef}
        >

          {routePolylines.map(
            (route) => (
              <Fragment
                key={route.id}
              >

                {/* WHITE OUTER CASING */}

                <Polyline
                  positions={
                    route.coords
                  }
                  pathOptions={{
                    color:
                      '#ffffff',

                    weight:
                      route.selected
                        ? 12
                        : 8,

                    opacity:
                      0.95,

                    lineCap:
                      'round',

                    lineJoin:
                      'round',
                  }}
                />


                {/* ACTUAL ROUTE */}

                <Polyline
                  positions={
                    route.coords
                  }
                  pathOptions={{
                    color:
                      route.color,

                    weight:
                      route.weight,

                    opacity:
                      route.opacity,

                    lineCap:
                      'round',

                    lineJoin:
                      'round',
                  }}
                >

                  {/* ROUTE LABEL */}

                  <Tooltip
                    permanent
                    direction="center"
                  >
                    {route.label}
                  </Tooltip>


                  {/* ROUTE DETAILS */}

                  <Popup>

                    <div className="min-w-[190px] text-xs">

                      <p className="font-bold text-slate-900">
                        {getRouteType(
                          route.route
                        )}{' '}
                        route
                      </p>


                      {route.route?.distanceKm != null && (
                        <p className="mt-1 text-slate-600">

                          Distance:{' '}

                          {formatRouteDistance(
                            route.route
                              .distanceKm
                          )}

                        </p>
                      )}


                      {route.route?.durationMin != null && (
                        <p className="text-slate-600">

                          ETA:{' '}

                          {formatRouteDuration(
                            route.route
                              .durationMin
                          )}

                        </p>
                      )}


                      {route.route?.riskLevel && (
                        <p className="text-slate-600">

                          Risk:{' '}

                          {String(
                            route.route
                              .riskLevel
                          ).toUpperCase()}

                        </p>
                      )}


                      {route.selected && (
                        <Badge
                          variant="live"
                          className="mt-2"
                        >
                          SELECTED ROUTE
                        </Badge>
                      )}

                    </div>

                  </Popup>

                </Polyline>

              </Fragment>
            )
          )}

        </LayerGroup>


        {/* ====================================================
            ORIGIN
        ==================================================== */}

        {origin?.lat != null &&
          origin?.lon != null && (

            <Marker
              position={[
                Number(
                  origin.lat
                ),

                Number(
                  origin.lon
                ),
              ]}
              icon={originIcon}
            >

              <Popup>

                <div className="text-xs">

                  <strong>
                    Origin
                  </strong>

                  <p className="mt-1 text-slate-600">
                    {origin.label}
                  </p>

                </div>

              </Popup>

            </Marker>

          )}


        {/* ====================================================
            DESTINATION
        ==================================================== */}

        {destination?.lat != null &&
          destination?.lon != null && (

            <Marker
              position={[
                Number(
                  destination.lat
                ),

                Number(
                  destination.lon
                ),
              ]}
              icon={
                destinationIcon
              }
            >

              <Popup>

                <div className="text-xs">

                  <strong>
                    Destination
                  </strong>

                  <p className="mt-1 text-slate-600">
                    {destination.label}
                  </p>

                </div>

              </Popup>

            </Marker>

          )}


        {/* ====================================================
            ACTIVE LOCATION
        ==================================================== */}

        {activeLocation?.lat != null &&
          activeLocation?.lon != null &&
          !origin && (

            <CircleMarker
              center={[
                Number(
                  activeLocation.lat
                ),

                Number(
                  activeLocation.lon
                ),
              ]}
              radius={8}
              pathOptions={{
                color:
                  '#0f766e',

                fillColor:
                  '#14b8a6',

                fillOpacity:
                  0.7,
              }}
            />

          )}


        {/* ====================================================
            WEATHER

            REAL OPEN-METEO DATA ONLY
        ==================================================== */}

        <LayerGroup
          ref={weatherLayerRef}
        >

          {showWeather && (

            <CircleMarker
              center={[
                Number(
                  activeLocation.lat
                ),

                Number(
                  activeLocation.lon
                ),
              ]}
              radius={18}
              pathOptions={{
                color:
                  '#0284c7',

                fillColor:
                  '#38bdf8',

                fillOpacity:
                  0.12,

                weight: 2,

                dashArray:
                  '4 4',
              }}
            >

              <Popup>

                <div className="min-w-[180px] text-xs">

                  <Badge variant="live">
                    LIVE WEATHER
                  </Badge>

                  <p className="mt-2 font-semibold">
                    Current Conditions
                  </p>


                  {weatherData.temperature != null && (
                    <p className="mt-1 text-slate-600">

                      Temperature:{' '}

                      {weatherData.temperature}
                      °C

                    </p>
                  )}


                  {weatherData.windSpeed != null && (
                    <p className="text-slate-600">

                      Wind:{' '}

                      {weatherData.windSpeed}
                      {' '}km/h

                    </p>
                  )}


                  {weatherData.precipitation != null && (
                    <p className="text-slate-600">

                      Precipitation:{' '}

                      {weatherData.precipitation}
                      {' '}mm

                    </p>
                  )}


                  {weatherData.weatherCode != null && (
                    <p className="text-slate-500">

                      Weather code:{' '}

                      {weatherData.weatherCode}

                    </p>
                  )}


                  <p className="mt-2 text-[10px] text-slate-400">
                    Source: Open-Meteo
                  </p>

                </div>

              </Popup>

            </CircleMarker>

          )}

        </LayerGroup>


        {/* ====================================================
            INCIDENTS

            MongoDB + Socket.IO incidents
        ==================================================== */}

        <LayerGroup
          ref={incidentsLayerRef}
        >

          {incidents.status ===
            'success' &&

            Array.isArray(
              incidents.data
            ) &&

            incidents.data.map(
              (incident) => {

                const lat =
                  incident.lat ??
                  incident.latitude ??
                  incident.location?.lat;

                const lon =
                  incident.lon ??
                  incident.lng ??
                  incident.longitude ??
                  incident.location?.lon;


                if (
                  lat == null ||
                  lon == null
                ) {
                  return null;
                }


                const severity = (
                  incident.severity ||
                  incident.level ||
                  'MODERATE'
                ).toUpperCase();


                return (

                  <Marker
                    key={
                      incident.id ||
                      incident._id ||
                      `${lat}-${lon}`
                    }

                    position={[
                      Number(lat),
                      Number(lon),
                    ]}

                    icon={
                      incidentIcon(
                        severity
                      )
                    }
                  >

                    <Popup
                      maxWidth={340}
                    >

                      <div className="w-[270px]">

                        {/* Incident type */}

                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Reported incident
                        </p>


                        <h3 className="mt-1 text-base font-bold text-slate-900">

                          {incident.type ||
                            'Incident'}

                        </h3>


                        {/* Severity */}

                        <div className="mt-2">

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${
                              String(
                                incident.severity
                              ).toUpperCase() ===
                                'HIGH' ||
                              String(
                                incident.severity
                              ).toUpperCase() ===
                                'BLOCKED'
                                ? 'bg-red-100 text-red-700'
                                : String(
                                    incident.severity
                                  ).toUpperCase() ===
                                  'MODERATE'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >

                            {String(
                              incident.severity ||
                                'MODERATE'
                            ).toUpperCase()}

                          </span>

                        </div>


                        {/* Description */}

                        {incident.description && (

                          <p className="mt-3 text-sm text-slate-700">

                            {incident.description}

                          </p>

                        )}


                        {/* INCIDENT PHOTO */}

                        {incident.image ? (

                          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">

                            <img
                              src={
                                incident.image
                              }

                              alt={`${
                                incident.type ||
                                'Incident'
                              } evidence`}

                              className="h-48 w-full object-cover"

                              loading="lazy"
                            />

                          </div>

                        ) : (

                          <div className="mt-3 rounded-xl bg-slate-100 px-3 py-4 text-center text-xs text-slate-500">

                            No photo attached

                          </div>

                        )}


                        {/* Location */}

                        <div className="mt-3 border-t border-slate-200 pt-2">

                          <p className="text-xs text-slate-500">

                            📍{' '}

                            {Number(
                              incident.latitude
                            ).toFixed(5)}

                            ,{' '}

                            {Number(
                              incident.longitude
                            ).toFixed(5)}

                          </p>


                          {/* Time */}

                          {(
                            incident.timestamp ||
                            incident.createdAt
                          ) && (

                            <p className="mt-1 text-xs text-slate-500">

                              🕒{' '}

                              {new Date(
                                incident.timestamp ||
                                  incident.createdAt
                              ).toLocaleString()}

                            </p>

                          )}


                          {/* Status */}

                          {incident.status && (

                            <p className="mt-1 text-xs text-slate-500">

                              Status:{' '}

                              {incident.status}

                            </p>

                          )}

                        </div>

                      </div>

                    </Popup>

                  </Marker>

                );
              }
            )}

        </LayerGroup>


        {/* ====================================================
            ROAD STATUS / CONFIRMED BLOCKAGES
        ==================================================== */}

        <LayerGroup
          ref={roadStatusLayerRef}
        >

          {blockages.status ===
            'success' &&

            Array.isArray(
              blockages.data
            ) &&

            blockages.data.map(
              (blockage) => {

                const lat =
                  blockage.lat ??
                  blockage.latitude ??
                  blockage.location?.lat;

                const lon =
                  blockage.lon ??
                  blockage.lng ??
                  blockage.longitude ??
                  blockage.location?.lon;


                if (
                  lat == null ||
                  lon == null
                ) {
                  return null;
                }


                return (

                  <Marker
                    key={
                      blockage.id ||
                      blockage._id ||
                      `blk-${lat}-${lon}`
                    }

                    position={[
                      Number(lat),
                      Number(lon),
                    ]}

                    icon={
                      blockageIcon
                    }
                  >

                    <Popup>

                      <div className="text-xs">

                        <Badge
                          variant="danger"
                        >
                          CONFIRMED BLOCKAGE
                        </Badge>


                        <p className="mt-1 font-semibold">

                          {blockage.name ||
                            blockage.roadName ||
                            'Blocked road'}

                        </p>


                        {blockage.description && (

                          <p className="mt-1 text-slate-600">

                            {blockage.description}

                          </p>

                        )}

                      </div>

                    </Popup>

                  </Marker>

                );
              }
            )}

        </LayerGroup>


        {/* ====================================================
            SACHET / NDMA ALERTS

            These remain independent of the six map-layer
            toggles because alerts are an alert feed, not
            confirmed road status.
        ==================================================== */}

        {alerts.status ===
          'success' &&

          Array.isArray(
            alerts.data
          ) &&

          alerts.data.map(
            (alert, index) => {

              const lat =
                alert.lat ??
                alert.latitude ??
                alert.location?.lat;

              const lon =
                alert.lon ??
                alert.lng ??
                alert.longitude ??
                alert.location?.lon;

              const polyCoords = alert.polygon
                ? normalizePolygonCoordinates(
                    alert.polygon.coordinates || alert.polygon
                  )
                : [];

              const alertKey =
                alert.sourceAlertId ||
                alert.id ||
                alert._id ||
                alert.identifier ||
                `alert-${index}`;

              const alertTitle =
                alert.title ||
                alert.headline ||
                alert.event ||
                'Disaster alert';

              const alertDescription =
                alert.description || '';

              const alertSeverity =
                alert.severity || '';

              if (
                Array.isArray(polyCoords) &&
                polyCoords.length >= 3
              ) {
                return (
                  <Polygon
                    key={`poly-${alertKey}`}
                    positions={polyCoords}
                    pathOptions={{
                      color: '#b45309',
                      fillColor: '#f59e0b',
                      fillOpacity: 0.25,
                      weight: 2,
                      dashArray: '3 4',
                    }}
                  >
                    <Popup>
                      <div className="text-xs">
                        <Badge variant="warn">
                          POTENTIAL HAZARD
                        </Badge>
                        <p className="mt-1 text-[10px] text-slate-500">
                          SACHET / NDMA alert
                        </p>
                        <p className="mt-1 font-semibold">
                          {alertTitle}
                        </p>
                        {alertDescription && (
                          <p className="mt-1 text-slate-600">
                            {alertDescription}
                          </p>
                        )}
                        {alertSeverity && (
                          <p className="mt-1 text-[10px] uppercase tracking-wide text-amber-700">
                            {alertSeverity}
                          </p>
                        )}
                      </div>
                    </Popup>
                  </Polygon>
                );
              }

              /*
               * Alerts without coordinates are kept in
               * the alert panel and are not randomly
               * placed on the map.
               */

              if (
                lat == null ||
                lon == null
              ) {
                return null;
              }


              return (

                <CircleMarker

                  key={`marker-${alertKey}`}

                  center={[
                    Number(lat),
                    Number(lon),
                  ]}

                  radius={10}

                  pathOptions={{
                    color:
                      '#b45309',

                    fillColor:
                      '#f59e0b',

                    fillOpacity:
                      0.35,

                    weight: 2,

                    dashArray:
                      '3 4',
                  }}
                >

                  <Popup>

                    <div className="text-xs">

                      <Badge
                        variant="warn"
                      >
                        POTENTIAL HAZARD
                      </Badge>


                      <p className="mt-1 text-[10px] text-slate-500">

                        SACHET / NDMA alert

                      </p>


                      <p className="mt-1 font-semibold">

                        {alertTitle}

                      </p>


                      {alertDescription && (

                        <p className="mt-1 text-slate-600">

                          {alertDescription}

                        </p>

                      )}


                      {alertSeverity && (

                        <p className="mt-1 text-[10px] uppercase tracking-wide text-amber-700">

                          {alertSeverity}

                        </p>

                      )}

                    </div>

                  </Popup>

                </CircleMarker>

              );
            }
          )}


        {/* ====================================================
            VEHICLES

            LIVE + EXACTLY THE 3 DEMO FLEET VEHICLES
        ==================================================== */}

        <LayerGroup
          ref={vehiclesLayerRef}
        >


          {/* --------------------------------------------------
              LIVE VEHICLES
          -------------------------------------------------- */}

          {Array.isArray(
            liveVehicles
          ) &&

            liveVehicles.map(
              (vehicle) => {

                const lat =
                  vehicle.lat ??
                  vehicle.latitude ??
                  vehicle.position?.[0] ??
                  vehicle.location?.lat;

                const lon =
                  vehicle.lon ??
                  vehicle.lng ??
                  vehicle.longitude ??
                  vehicle.position?.[1] ??
                  vehicle.location?.lon;


                if (
                  lat == null ||
                  lon == null
                ) {
                  return null;
                }


                return (

                  <Marker

                    key={`live-${
                      vehicle.id ||
                      vehicle._id ||
                      vehicle.name
                    }`}

                    position={[
                      Number(lat),
                      Number(lon),
                    ]}

                    icon={
                      vehicleIcon(false)
                    }
                  >

                    <Popup>

                      <div className="text-xs">

                        <Badge
                          variant="live"
                          dot
                        >
                          LIVE
                        </Badge>


                        <p className="mt-1 font-semibold">

                          {vehicle.name ||
                            vehicle.vehicleId ||
                            vehicle.id}

                        </p>


                        {vehicle.status && (

                          <p className="text-slate-500">

                            {vehicle.status}

                          </p>

                        )}

                      </div>

                    </Popup>

                  </Marker>

                );
              }
            )}


          {/* --------------------------------------------------
              DEMO FLEET
          -------------------------------------------------- */}

          {Array.isArray(
            demoFleet
          ) &&

            demoFleet.map(
              (vehicle) => {

                if (
                  !Array.isArray(
                    vehicle.position
                  ) ||
                  vehicle.position.length < 2
                ) {
                  return null;
                }


                return (

                  <Marker

                    key={`demo-${vehicle.id}`}

                    position={
                      vehicle.position
                    }

                    icon={
                      vehicleIcon(true)
                    }
                  >

                    <Popup>

                      <div className="text-xs">

                        <Badge
                          variant="demo"
                        >
                          DEMO FLEET
                        </Badge>


                        <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-amber-700">

                          Hackathon Simulation

                        </p>


                        <p className="mt-1 font-semibold">

                          {vehicle.name}

                        </p>


                        <p className="text-slate-500">

                          {vehicle.status}

                        </p>

                      </div>

                    </Popup>

                  </Marker>

                );
              }
            )}

        </LayerGroup>


      </MapContainer>


      <MapLegend />

    </div>
  );
}