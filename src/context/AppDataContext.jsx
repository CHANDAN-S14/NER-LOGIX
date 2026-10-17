import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  getStatus,
  getIncidents,
  getBlockedRoads,
  getRoads,
  getVehicles,
  getSachetAlerts,
  planRoute,
  analyzeRisk,
  analyzeRoutes,
  createIncident,
  ApiError,
} from '../services/api';

import { fetchWeather } from '../services/weather';

import {
  connectSocket,
  disconnectSocket,
  onSocketEvent,
  isSocketConnected,
} from '../services/socket';

import {
  CONNECTION,
  DEMO_FLEET,
  DATA_SOURCE,
  MAP_DEFAULT,
} from '../services/config';

import { reverseGeocode } from '../services/geocode';


/* =========================================================
   CONTEXTS
   ========================================================= */

const AppDataContext = createContext(null);

/*
 * IMPORTANT:
 * Map layer visibility is intentionally kept OUTSIDE the
 * main AppDataContext.
 *
 * This prevents a layer toggle from causing every component
 * using useAppData() to rerender.
 */
const MapLayerVisibilityContext = createContext(null);


/* =========================================================
   HELPERS
   ========================================================= */

const idle = {
  status: 'idle',
  data: null,
  error: null,
};

function asyncState(status, data = null, error = null, warning = null) {
  return {
    status,
    data,
    error,
    warning,
  };
}


/* =========================================================
   PROVIDER
   ========================================================= */

export function AppDataProvider({ children }) {

  /* =======================================================
     CONNECTION
     ======================================================= */

  const [backendStatus, setBackendStatus] = useState(
    CONNECTION.CONNECTING
  );

  const [socketStatus, setSocketStatus] = useState(
    CONNECTION.OFFLINE
  );

  const [aiStatus, setAiStatus] = useState(
    CONNECTION.OFFLINE
  );


  /* =======================================================
     LOCATION
     Manual location must not be overwritten by GPS.
     ======================================================= */

  const [locationMode, setLocationMode] = useState('none');

  const [gpsPosition, setGpsPosition] = useState(null);

  const [manualLocation, setManualLocation] = useState(null);

  const [activeLocation, setActiveLocation] = useState(null);


  /* =======================================================
     ROUTE PLANNER
     ======================================================= */

  const [origin, setOrigin] = useState(null);

  const [destination, setDestination] = useState(null);

  const [routes, setRoutes] = useState(idle);

  const [selectedRouteId, setSelectedRouteId] = useState(null);


  /* =======================================================
     DOMAIN DATA
     ======================================================= */

  const [incidents, setIncidents] = useState(idle);

  const [roads, setRoads] = useState(idle);

  const [blockages, setBlockages] = useState(idle);

  const [vehicles, setVehicles] = useState(idle);

  const [alerts, setAlerts] = useState(idle);

  const [weather, setWeather] = useState(idle);

  const [risk, setRisk] = useState(idle);


  /* =======================================================
     MAP UI
     ======================================================= */

  const [mapLayer, setMapLayer] = useState('satellite');

  const [mapMode, setMapMode] = useState('overview');


  /* =======================================================
     MAP DATA-LAYER VISIBILITY
     
     IMPORTANT:
     This state is deliberately separate from AppDataContext.
     
     Before:
       mapLayers
       ↓
       AppDataContext
       ↓
       LiveMap rerender
       ↓
       Leaflet layers rebuilt
       ↓
       toggle delay
     
     Now:
       mapLayers
       ↓
       MapLayerVisibilityContext
       ↓
       only map visibility controller reacts
     ======================================================= */

  const [mapLayers, setMapLayers] = useState({
    incidents: true,
    riskZones: true,
    roadStatus: true,
    vehicles: true,
    routes: true,
    weather: true,
  });

  const setMapLayerVisibility = useCallback(
    (layer, visible) => {
      setMapLayers((current) => {
        const nextValue = Boolean(visible);

        /*
         * Avoid creating a new state object when the value
         * is already the requested value.
         */
        if (current[layer] === nextValue) {
          return current;
        }

        return {
          ...current,
          [layer]: nextValue,
        };
      });
    },
    []
  );


  /* =======================================================
     SIDEBAR / PANELS
     ======================================================= */

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [activePanel, setActivePanel] = useState('planner');


  /* =======================================================
     REFS
     ======================================================= */

  const pollRef = useRef(null);


  /* =======================================================
     CONNECTION PROBE
     ======================================================= */

  const probeBackend = useCallback(async () => {

    setBackendStatus(CONNECTION.CONNECTING);

    try {

      const status = await getStatus();

      setBackendStatus(CONNECTION.LIVE);

      if (
        status?.ai === 'online' ||
        status?.services?.ai === 'online'
      ) {
        setAiStatus(CONNECTION.LIVE);
      } else if (
        status?.ai === 'offline' ||
        status?.services?.ai === 'offline'
      ) {
        setAiStatus(CONNECTION.OFFLINE);
      }

      return status;

    } catch {

      setBackendStatus(CONNECTION.OFFLINE);

      setAiStatus(CONNECTION.OFFLINE);

      return null;
    }
  }, []);


  /* =======================================================
     DATA LOADERS
     ======================================================= */

  const loadIncidents = useCallback(async () => {

    setIncidents((state) =>
      asyncState('loading', state.data)
    );

    try {

      const data = await getIncidents();

      const list = Array.isArray(data)
        ? data
        : data?.incidents ||
          data?.data ||
          [];

      setIncidents(
        asyncState('success', list)
      );

      return list;

    } catch (err) {

      setIncidents(
        asyncState(
          'error',
          null,
          err.message
        )
      );

      return null;
    }
  }, []);


  const loadBlockages = useCallback(async () => {

    setBlockages((state) =>
      asyncState('loading', state.data)
    );

    try {

      const data = await getBlockedRoads();

      const list = Array.isArray(data)
        ? data
        : data?.roads ||
          data?.blockages ||
          data?.data ||
          [];

      setBlockages(
        asyncState('success', list)
      );

      return list;

    } catch (err) {

      setBlockages(
        asyncState(
          'error',
          null,
          err.message
        )
      );

      return null;
    }
  }, []);


  const loadRoads = useCallback(async () => {

    setRoads((state) =>
      asyncState('loading', state.data)
    );

    try {

      const data = await getRoads();

      const list = Array.isArray(data)
        ? data
        : data?.roads ||
          data?.data ||
          [];

      setRoads(
        asyncState('success', list)
      );

      return list;

    } catch (err) {

      setRoads(
        asyncState(
          'error',
          null,
          err.message
        )
      );

      return null;
    }
  }, []);


  const loadVehicles = useCallback(async () => {

    setVehicles((state) =>
      asyncState('loading', state.data)
    );

    try {

      const data = await getVehicles();

      const list = Array.isArray(data)
        ? data
        : data?.vehicles ||
          data?.data ||
          [];

      setVehicles(
        asyncState('success', list)
      );

      return list;

    } catch (err) {

      setVehicles(
        asyncState(
          'error',
          null,
          err.message
        )
      );

      return null;
    }
  }, []);


  const loadAlerts = useCallback(async () => {

    setAlerts((state) =>
      asyncState('loading', state.data)
    );

    try {

      const data = await getSachetAlerts();

      const list = Array.isArray(data)
        ? data
        : data?.alerts ||
          data?.data ||
          [];

      setAlerts(
        asyncState('success', list)
      );

      return list;

    } catch (err) {

      setAlerts(
        asyncState(
          'error',
          null,
          err.message
        )
      );

      return null;
    }
  }, []);


  /* =======================================================
     WEATHER
     ======================================================= */

  const loadWeather = useCallback(
    async (lat, lon) => {

      if (lat == null || lon == null) {

        setWeather(
          asyncState(
            'empty',
            null,
            'No location selected'
          )
        );

        return null;
      }

      setWeather((state) =>
        asyncState('loading', state.data)
      );

      try {

        const data = await fetchWeather(
          lat,
          lon
        );

        setWeather(
          asyncState('success', data)
        );

        return data;

      } catch (err) {

        setWeather(
          asyncState(
            'error',
            null,
            err.message
          )
        );

        return null;
      }
    },
    []
  );


  /* =======================================================
     AI RISK
     ======================================================= */

  const loadRisk = useCallback(
    async (payload) => {

      setRisk((state) =>
        asyncState('loading', state.data)
      );

      try {

        const data = await analyzeRisk(
          payload
        );

        setRisk(
          asyncState(
            'success',
            data?.analysis || data
          )
        );

        setAiStatus(CONNECTION.LIVE);

        return data;

      } catch (err) {

        setRisk(
          asyncState(
            'error',
            null,
            err.message ||
              'AI analysis unavailable'
          )
        );

        if (
          err instanceof ApiError &&
          (err.code === 'NETWORK' ||
            err.status === 0)
        ) {
          setAiStatus(
            CONNECTION.OFFLINE
          );
        }

        return null;
      }
    },
    []
  );


  /* =======================================================
     ROUTE PLANNER
     ======================================================= */

  const findSafeRoute = useCallback(
    async () => {
      if (
        !origin?.lat ||
        (origin?.lon == null && origin?.lng == null) ||
        !destination?.lat ||
        (destination?.lon == null && destination?.lng == null)
      ) {
        setRoutes(
          asyncState(
            'error',
            null,
            'Origin and destination required'
          )
        );
        return null;
      }

      setRoutes(asyncState('loading'));
      setSelectedRouteId(null);

      try {
        const planned = await planRoute({
          origin: {
            lat: Number(origin.lat),
            lon: Number(origin.lon ?? origin.lng),
          },
          destination: {
            lat: Number(destination.lat),
            lon: Number(destination.lon ?? destination.lng),
          },
        });

        let routeList = Array.isArray(planned)
          ? planned
          : planned?.routes ||
            planned?.data ||
            [];

        if (!routeList.length) {
          throw new Error('No routes returned for this corridor pair');
        }

        /* -------------------------------------------------------------------
           AI ENRICHMENT: Compact Payload
           Do NOT send thousands of GeoJSON coordinates, legs, or steps to AI.
           Send only route summaries to eliminate HTTP 413 Payload Too Large.
           ------------------------------------------------------------------- */
        let aiWarning = null;
        let recommendedId = null;

        try {
          const compactRoutes = routeList.map((r, i) => ({
            id: String(r.id || `route-${i + 1}`),
            distance: Number(r.distance ?? (r.distanceKm ? r.distanceKm * 1000 : 0)),
            duration: Number(r.duration ?? (r.durationMin ? r.durationMin * 60 : 0)),
            blocked: Boolean(r.blocked),
            roadCondition: String(
              r.roadCondition ||
              (weather.data?.rainfall > 5 ? 'wet' : weather.data?.rainfall > 0 ? 'damp' : 'normal')
            ),
            incidentSeverity: String(
              r.incidentSeverity ||
              (incidents.data?.length ? incidents.data[0].severity : 'none')
            ),
          }));

          const analyzed = await analyzeRoutes({
            routes: compactRoutes,
            weather: weather.data
              ? {
                  rainfall: Number(weather.data.rainfall ?? 0),
                  temperature: Number(weather.data.temperature ?? 25),
                  wind: Number(weather.data.wind ?? 0),
                  visibility: Number(weather.data.visibility ?? 10),
                }
              : undefined,
            historicalRisk: 50,
          });

          const evaluatedList =
            analyzed?.routes || (Array.isArray(analyzed) ? analyzed : []);
          const evalMap = new Map(
            evaluatedList.map((item) => [String(item.id), item])
          );

          recommendedId = analyzed?.recommendedRouteId || null;

          // Merge AI evaluation onto original route list while strictly preserving OSRM geometry
          routeList = routeList.map((orig, i) => {
            const rid = String(orig.id || `route-${i + 1}`);
            const evald = evalMap.get(rid) || {};
            const labels = [...(orig.labels || [])];
            if (
              recommendedId &&
              rid === String(recommendedId) &&
              !labels.includes('SAFEST') &&
              !labels.includes('RECOMMENDED')
            ) {
              labels.push('SAFEST', 'RECOMMENDED');
            }
            return {
              ...orig,
              ...evald,
              geometry: orig.geometry, // PRESERVE COMPLETE ORIGINAL GEOMETRY
              legs: orig.legs,
              steps: orig.steps,
              labels: labels.length ? labels : evald.labels || orig.labels,
            };
          });

          setAiStatus(CONNECTION.LIVE);
        } catch (aiErr) {
          console.warn('AI route analysis unavailable, proceeding with standard corridors:', aiErr);
          setAiStatus(CONNECTION.OFFLINE);
          aiWarning = 'AI scoring temporarily unavailable. Displaying standard calculated corridors.';
        }

        setRoutes(
          asyncState(
            'success',
            routeList,
            null,
            aiWarning
          )
        );

        const firstId =
          (recommendedId &&
            routeList.find((r) => String(r.id) === String(recommendedId))?.id) ||
          routeList[0]?.id ||
          routeList[0]?._id ||
          '0';

        setSelectedRouteId(firstId);

        // Mobile experience: automatically close mobile drawer to show live map
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          setSidebarOpen(false);
        }

        /* -----------------------------------------------
           Trigger risk analysis for selected corridor
           ----------------------------------------------- */
        loadRisk({
          origin,
          destination,
          weather: weather.data,
          incidents: incidents.data,
        });

        return routeList;
      } catch (err) {
        setRoutes(
          asyncState(
            'error',
            null,
            err.message
          )
        );
        return null;
      }
    },
    [
      origin,
      destination,
      weather.data,
      incidents.data,
      loadRisk,
      setSidebarOpen,
    ]
  );


  /* =======================================================
     INCIDENT SUBMISSION
     ======================================================= */

  const submitIncident = useCallback(
    async (payload) => {

      const created =
        await createIncident(payload);

      /*
       * Refresh the database list.
       * Socket.IO will also update the map immediately
       * when incident:new is received.
       */
      await loadIncidents();

      return created;
    },
    [loadIncidents]
  );


  /* =======================================================
     LOCATION HELPERS
     ======================================================= */

  const applyGpsLocation = useCallback(
    async (pos) => {

      if (!pos) return;

      setGpsPosition(pos);

      setLocationMode('gps');

      let label =
        `${pos.lat.toFixed(4)}, ${pos.lon.toFixed(4)}`;

      try {

        const rev =
          await reverseGeocode(
            pos.lat,
            pos.lon
          );

        if (rev?.label) {
          label = rev.label;
        }

      } catch {

        /*
         * Keep coordinates label.
         */
      }


      const loc = {

        lat: pos.lat,

        lon: pos.lon,

        label,

        source: 'gps',

      };


      setActiveLocation(loc);


      /*
       * Only set origin if one doesn't already exist.
       */
      setOrigin(
        (previous) =>
          previous || loc
      );


      /*
       * Fetch REAL weather for current location.
       */
      loadWeather(
        pos.lat,
        pos.lon
      );

    },
    [loadWeather]
  );


  const applyManualLocation = useCallback(
    (loc) => {

      if (!loc) return;

      const next = {

        lat: loc.lat,

        lon: loc.lon,

        label: loc.label,

        source: 'manual',

      };


      setManualLocation(next);

      setLocationMode('manual');

      setActiveLocation(next);


      /*
       * Fetch REAL weather for manual location.
       */
      loadWeather(
        next.lat,
        next.lon
      );

    },
    [loadWeather]
  );


  /* =======================================================
     BOOTSTRAP / REFRESH
     ======================================================= */

  const refreshAll = useCallback(
    async () => {

      const status =
        await probeBackend();


      if (!status) {

        setIncidents(
          asyncState(
            'error',
            null,
            'Unable to connect to backend'
          )
        );

        setBlockages(
          asyncState(
            'error',
            null,
            'Unable to connect to backend'
          )
        );

        setRoads(
          asyncState(
            'error',
            null,
            'Unable to connect to backend'
          )
        );

        setVehicles(
          asyncState(
            'error',
            null,
            'Unable to connect to backend'
          )
        );

        setAlerts(
          asyncState(
            'error',
            null,
            'Unable to connect to backend'
          )
        );

        return;
      }


      await Promise.allSettled([

        loadIncidents(),

        loadBlockages(),

        loadRoads(),

        loadVehicles(),

        loadAlerts(),

      ]);

    },
    [
      probeBackend,
      loadIncidents,
      loadBlockages,
      loadRoads,
      loadVehicles,
      loadAlerts,
    ]
  );


  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  useEffect(() => {

    refreshAll();

    pollRef.current =
      setInterval(() => {

        probeBackend();

      }, 45000);


    return () => {

      if (pollRef.current) {

        clearInterval(
          pollRef.current
        );

        pollRef.current = null;
      }

    };

  }, [
    refreshAll,
    probeBackend,
  ]);


  /* =======================================================
     SOCKET.IO
     ======================================================= */

  useEffect(() => {

    /*
     * Socket only connects after backend is live.
     */
    if (
      backendStatus !==
      CONNECTION.LIVE
    ) {

      disconnectSocket();

      setSocketStatus(
        CONNECTION.OFFLINE
      );

      return undefined;
    }


    const sock =
      connectSocket();


    if (!sock) {

      setSocketStatus(
        CONNECTION.OFFLINE
      );

      return undefined;
    }


    const onConnect = () => {

      setSocketStatus(
        CONNECTION.LIVE
      );

    };


    const onDisconnect = () => {

      setSocketStatus(
        CONNECTION.OFFLINE
      );

    };


    sock.on(
      'connect',
      onConnect
    );

    sock.on(
      'disconnect',
      onDisconnect
    );


    if (sock.connected) {

      onConnect();

    }


    const unsubs = [

      /* -----------------------------------------------
         NEW INCIDENT
         ----------------------------------------------- */

      onSocketEvent(
        'incident:new',
        (payload) => {

          setIncidents(
            (state) => {

              const list =
                Array.isArray(
                  state.data
                )
                  ? state.data
                  : [];


              const payloadId =
                payload?.id ||
                payload?._id;


              return asyncState(
                'success',
                [
                  payload,

                  ...list.filter(
                    (incident) => {

                      const incidentId =
                        incident?.id ||
                        incident?._id;

                      return (
                        incidentId !==
                        payloadId
                      );

                    }
                  ),

                ]
              );

            }
          );

        }
      ),


      /* -----------------------------------------------
         INCIDENT UPDATED
         ----------------------------------------------- */

      onSocketEvent(
        'incident:updated',
        (payload) => {

          setIncidents(
            (state) => {

              const list =
                Array.isArray(
                  state.data
                )
                  ? state.data
                  : [];


              const payloadId =
                payload?.id ||
                payload?._id;


              return asyncState(
                'success',

                list.map(
                  (incident) => {

                    const incidentId =
                      incident?.id ||
                      incident?._id;


                    if (
                      incidentId ===
                      payloadId
                    ) {

                      return {
                        ...incident,
                        ...payload,
                      };

                    }


                    return incident;

                  }
                )
              );

            }
          );

        }
      ),


      /* -----------------------------------------------
         ROAD BLOCKED
         ----------------------------------------------- */

      onSocketEvent(
        'road:blocked',
        (payload) => {

          setBlockages(
            (state) => {

              const list =
                Array.isArray(
                  state.data
                )
                  ? state.data
                  : [];


              return asyncState(
                'success',
                [
                  payload,
                  ...list,
                ]
              );

            }
          );

        }
      ),


      /* -----------------------------------------------
         ROAD UPDATED
         ----------------------------------------------- */

      onSocketEvent(
        'road:updated',
        () => {

          loadBlockages();

          loadRoads();

        }
      ),


      /* -----------------------------------------------
         VEHICLE LOCATION
         ----------------------------------------------- */

      onSocketEvent(
        'vehicle:location',
        (payload) => {

          setVehicles(
            (state) => {

              const list =
                Array.isArray(
                  state.data
                )
                  ? state.data
                  : [];


              return asyncState(
                'success',

                list.map(
                  (vehicle) => {

                    const vehicleId =
                      vehicle?.id ||
                      vehicle?._id ||
                      vehicle?.name;


                    const payloadId =
                      payload?.id ||
                      payload?._id ||
                      payload?.name;


                    if (
                      vehicleId ===
                      payloadId
                    ) {

                      return {
                        ...vehicle,
                        ...payload,
                      };

                    }


                    return vehicle;

                  }
                )
              );

            }
          );

        }
      ),


      /* -----------------------------------------------
         LIVE UPDATE
         ----------------------------------------------- */

      onSocketEvent(
        'live:update',
        () => {

          loadIncidents();

          loadBlockages();

        }
      ),

    ];


    return () => {

      unsubs.forEach(
        (unsubscribe) =>
          unsubscribe?.()
      );


      sock.off(
        'connect',
        onConnect
      );

      sock.off(
        'disconnect',
        onDisconnect
      );

    };

  }, [
    backendStatus,
    loadBlockages,
    loadRoads,
    loadIncidents,
  ]);


  /* =======================================================
     DEMO FLEET
     
     Exactly the requested 3 hackathon vehicles.
     Clearly marked as DEMO.
     ======================================================= */

  const demoFleet = useMemo(
    () =>
      DEMO_FLEET.map(
        (vehicle) => ({

          ...vehicle,

          dataSource:
            DATA_SOURCE.DEMO,

          isDemo: true,

        })
      ),
    []
  );


  /* =======================================================
     LIVE VEHICLES
     ======================================================= */

  const liveVehicles = useMemo(
    () => {

      if (
        vehicles.status !==
          'success' ||
        !Array.isArray(
          vehicles.data
        )
      ) {

        return [];

      }


      return vehicles.data.map(
        (vehicle) => ({

          ...vehicle,

          dataSource:
            DATA_SOURCE.LIVE,

          isDemo: false,

        })
      );

    },
    [vehicles]
  );


  /* =======================================================
     SELECTED ROUTE
     ======================================================= */

  const selectedRoute = useMemo(
    () => {

      if (
        routes.status !==
          'success' ||
        !Array.isArray(
          routes.data
        )
      ) {

        return null;

      }


      return (

        routes.data.find(
          (route, index) => {

            const routeId =
              route?.id ||
              route?._id ||
              index;

            return (
              String(routeId) ===
              String(selectedRouteId)
            );

          }
        )

        ||

        routes.data[0]

        ||

        null

      );

    },
    [
      routes,
      selectedRouteId,
    ]
  );


  /* =======================================================
     MAIN APP DATA CONTEXT VALUE
     
     IMPORTANT:
     mapLayers and setMapLayerVisibility are NOT included.
     
     Therefore changing a map checkbox does NOT invalidate
     this entire context value.
     ======================================================= */

  const value = useMemo(
    () => ({

      /* -----------------------------------------------
         CONNECTION
         ----------------------------------------------- */

      backendStatus,

      socketStatus,

      aiStatus,

      isBackendLive:
        backendStatus ===
        CONNECTION.LIVE,

      isSocketLive:
        socketStatus ===
          CONNECTION.LIVE ||
        isSocketConnected(),

      isAiLive:
        aiStatus ===
        CONNECTION.LIVE,


      /* -----------------------------------------------
         LOCATION
         ----------------------------------------------- */

      locationMode,

      gpsPosition,

      manualLocation,

      activeLocation,

      applyGpsLocation,

      applyManualLocation,

      setOrigin,

      setDestination,

      origin,

      destination,


      /* -----------------------------------------------
         ROUTES
         ----------------------------------------------- */

      routes,

      selectedRouteId,

      setSelectedRouteId,

      selectedRoute,

      findSafeRoute,


      /* -----------------------------------------------
         DOMAIN DATA
         ----------------------------------------------- */

      incidents,

      roads,

      blockages,

      vehicles,

      alerts,

      weather,

      risk,

      demoFleet,

      liveVehicles,


      /* -----------------------------------------------
         MAP
         ----------------------------------------------- */

      mapLayer,

      setMapLayer,

      mapMode,

      setMapMode,

      mapDefault:
        MAP_DEFAULT,


      /* -----------------------------------------------
         SIDEBAR / PANELS
         ----------------------------------------------- */

      sidebarOpen,

      setSidebarOpen,

      activePanel,

      setActivePanel,


      /* -----------------------------------------------
         ACTIONS
         ----------------------------------------------- */

      refreshAll,

      loadIncidents,

      loadBlockages,

      loadRoads,

      loadVehicles,

      loadAlerts,

      loadWeather,

      loadRisk,

      submitIncident,

      probeBackend,

    }),

    [

      /* Connection */

      backendStatus,

      socketStatus,

      aiStatus,


      /* Location */

      locationMode,

      gpsPosition,

      manualLocation,

      activeLocation,

      applyGpsLocation,

      applyManualLocation,

      origin,

      destination,


      /* Routes */

      routes,

      selectedRouteId,

      selectedRoute,

      findSafeRoute,


      /* Domain */

      incidents,

      roads,

      blockages,

      vehicles,

      alerts,

      weather,

      risk,

      demoFleet,

      liveVehicles,


      /* Map */

      mapLayer,

      mapMode,


      /* Sidebar */

      sidebarOpen,

      activePanel,


      /* Actions */

      refreshAll,

      loadIncidents,

      loadBlockages,

      loadRoads,

      loadVehicles,

      loadAlerts,

      loadWeather,

      loadRisk,

      submitIncident,

      probeBackend,

    ]
  );


  /* =======================================================
     SEPARATE MAP VISIBILITY CONTEXT VALUE
     ======================================================= */

  const mapLayerVisibilityValue =
    useMemo(
      () => ({

        mapLayers,

        setMapLayerVisibility,

      }),
      [
        mapLayers,
        setMapLayerVisibility,
      ]
    );


  /* =======================================================
     PROVIDERS
     ======================================================= */

  return (

    <AppDataContext.Provider
      value={value}
    >

      <MapLayerVisibilityContext.Provider
        value={
          mapLayerVisibilityValue
        }
      >

        {children}

      </MapLayerVisibilityContext.Provider>

    </AppDataContext.Provider>

  );
}


/* =========================================================
   MAIN APP DATA HOOK
   ========================================================= */

export function useAppData() {

  const ctx =
    useContext(
      AppDataContext
    );


  if (!ctx) {

    throw new Error(
      'useAppData must be used within AppDataProvider'
    );

  }


  return ctx;
}


/* =========================================================
   MAP LAYER VISIBILITY HOOK
   ========================================================= */

export function useMapLayerVisibility() {

  const ctx =
    useContext(
      MapLayerVisibilityContext
    );


  if (!ctx) {

    throw new Error(
      'useMapLayerVisibility must be used within AppDataProvider'
    );

  }


  return ctx;
}