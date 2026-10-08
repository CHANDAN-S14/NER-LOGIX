import {
  Plus,
  Minus,
  Crosshair,
  Layers,
  LocateFixed,
  AlertTriangle,
  Target,
  Ban,
  Truck,
  Route,
  Droplets,
  Check,
} from 'lucide-react';

import { useState } from 'react';
import { useMap } from 'react-leaflet';

import {
  useAppData,
  useMapLayerVisibility,
} from '../../context/AppDataContext';

import useGeolocation from '../../hooks/useGeolocation';


export default function MapControls() {
  const map = useMap();

  /* -------------------------------------------------------
     Normal application data
     ------------------------------------------------------- */

  const {
    mapLayer,
    setMapLayer,
    applyGpsLocation,
    activeLocation,
  } = useAppData();


  /* -------------------------------------------------------
     MAP LAYER VISIBILITY
     
     IMPORTANT:
     This is now isolated from AppDataContext.
     Toggling a layer will not rerender the whole application.
     ------------------------------------------------------- */

  const {
    mapLayers,
    setMapLayerVisibility,
  } = useMapLayerVisibility();


  const {
    requestLocation,
    loading,
  } = useGeolocation();


  const [layersOpen, setLayersOpen] =
    useState(false);


  /* -------------------------------------------------------
     BASE MAPS
     ------------------------------------------------------- */

  const baseLayers = [
    {
      id: 'standard',
      label: 'Standard',
    },
    {
      id: 'satellite',
      label: 'Satellite',
    },
    {
      id: 'terrain',
      label: 'Terrain',
    },
  ];


  /* -------------------------------------------------------
     DATA LAYERS
     ------------------------------------------------------- */

  const dataLayers = [
    {
      id: 'incidents',
      label: 'Incidents',
      icon: AlertTriangle,
    },
    {
      id: 'riskZones',
      label: 'Risk Zones',
      icon: Target,
    },
    {
      id: 'roadStatus',
      label: 'Road Status',
      icon: Ban,
    },
    {
      id: 'vehicles',
      label: 'Vehicles',
      icon: Truck,
    },
    {
      id: 'routes',
      label: 'Routes',
      icon: Route,
    },
    {
      id: 'weather',
      label: 'Weather',
      icon: Droplets,
    },
  ];


  /* -------------------------------------------------------
     TOGGLE
     ------------------------------------------------------- */

  const handleToggle = (layerId) => {
    const current =
      Boolean(mapLayers?.[layerId]);

    setMapLayerVisibility(
      layerId,
      !current
    );
  };


  return (
    <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">

      {/* ===================================================
          ZOOM CONTROLS
      =================================================== */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">

        <button
          type="button"
          aria-label="Zoom in"
          className="flex h-10 w-10 items-center justify-center border-b border-slate-100 text-slate-700 hover:bg-slate-50"
          onClick={() => map.zoomIn()}
        >
          <Plus className="h-4 w-4" />
        </button>


        <button
          type="button"
          aria-label="Zoom out"
          className="flex h-10 w-10 items-center justify-center text-slate-700 hover:bg-slate-50"
          onClick={() => map.zoomOut()}
        >
          <Minus className="h-4 w-4" />
        </button>

      </div>


      {/* ===================================================
          CURRENT LOCATION
      =================================================== */}

      <button
        type="button"
        aria-label="Use my location"
        disabled={loading}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-brand-700 shadow-md hover:bg-brand-50 disabled:opacity-50"
        onClick={async () => {
          try {
            const pos =
              await requestLocation();

            await applyGpsLocation(pos);

            map.flyTo(
              [pos.lat, pos.lon],
              Math.max(
                map.getZoom(),
                13
              ),
              {
                duration: 0.8,
              }
            );
          } catch {
            // Location error handled by hook.
          }
        }}
      >

        {activeLocation?.source === 'gps' ? (
          <LocateFixed className="h-4 w-4" />
        ) : (
          <Crosshair className="h-4 w-4" />
        )}

      </button>


      {/* ===================================================
          LAYERS
      =================================================== */}

      <div className="relative">

        {/* -------------------------------------------------
            LAYER BUTTON
        ------------------------------------------------- */}

        <button
          type="button"
          aria-label="Map layers"
          aria-expanded={layersOpen}
          onClick={() =>
            setLayersOpen(
              (open) => !open
            )
          }
          className={`
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-xl
            border
            border-slate-200
            shadow-md
            transition-colors
            ${
              layersOpen
                ? 'bg-brand-800 text-white'
                : 'bg-brand-700 text-white hover:bg-brand-800'
            }
          `}
        >
          <Layers className="h-4 w-4" />
        </button>


        {/* -------------------------------------------------
            PANEL
        ------------------------------------------------- */}

        {layersOpen && (
          <div
            className="
              absolute
              right-12
              top-0
              w-56
              rounded-xl
              border
              border-slate-200
              bg-white
              p-3
              shadow-xl
            "
          >

            {/* HEADER */}

            <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">

              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Map Layers
              </span>

              <button
                type="button"
                onClick={() =>
                  setLayersOpen(false)
                }
                className="text-[10px] text-slate-400 hover:text-slate-700"
              >
                Close
              </button>

            </div>


            {/* DATA LAYERS */}

            <div className="space-y-1">

              {dataLayers.map(
                ({
                  id,
                  label,
                  icon: Icon,
                }) => {

                  const enabled =
                    mapLayers?.[id] ??
                    true;


                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={enabled}
                      onClick={() =>
                        handleToggle(id)
                      }
                      className="
                        flex
                        w-full
                        items-center
                        gap-2
                        rounded-lg
                        px-2
                        py-2
                        text-left
                        text-xs
                        font-medium
                        transition-colors
                        hover:bg-slate-50
                      "
                    >

                      <Icon
                        className={`
                          h-4 w-4
                          ${
                            enabled
                              ? 'text-brand-700'
                              : 'text-slate-400'
                          }
                        `}
                      />


                      <span
                        className={`
                          flex-1
                          ${
                            enabled
                              ? 'text-slate-700'
                              : 'text-slate-400'
                          }
                        `}
                      >
                        {label}
                      </span>


                      {/* TOGGLE */}

                      <span
                        className={`
                          relative
                          h-5
                          w-9
                          rounded-full
                          transition-colors
                          ${
                            enabled
                              ? 'bg-brand-700'
                              : 'bg-slate-300'
                          }
                        `}
                      >

                        <span
                          className={`
                            absolute
                            top-0.5
                            h-4
                            w-4
                            rounded-full
                            bg-white
                            shadow
                            transition-transform
                            ${
                              enabled
                                ? 'translate-x-4'
                                : 'translate-x-0.5'
                            }
                          `}
                        />

                      </span>

                    </button>
                  );
                }
              )}

            </div>


            {/* BASE MAP */}

            <div className="mt-3 border-t border-slate-100 pt-2">

              <div className="mb-1 px-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Base Map
              </div>


              {baseLayers.map(
                (layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() =>
                      setMapLayer(
                        layer.id
                      )
                    }
                    className={`
                      flex
                      w-full
                      items-center
                      rounded-lg
                      px-2
                      py-1.5
                      text-left
                      text-[11px]
                      font-medium
                      ${
                        mapLayer === layer.id
                          ? 'bg-brand-50 text-brand-800'
                          : 'text-slate-600 hover:bg-slate-50'
                      }
                    `}
                  >

                    <span className="flex-1">
                      {layer.label}
                    </span>

                    {mapLayer === layer.id && (
                      <Check className="h-3.5 w-3.5 text-brand-700" />
                    )}

                  </button>
                )
              )}

            </div>

          </div>
        )}

      </div>

    </div>
  );
}