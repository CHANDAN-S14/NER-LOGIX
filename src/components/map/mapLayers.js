// src/components/map/mapLayers.js

export const TILE_LAYERS = {
  standard: {
    id: 'standard',
    name: 'Standard',
    url:
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },

  satellite: {
    id: 'satellite',
    name: 'Satellite',
    url:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Sources: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 19,
  },

  terrain: {
    id: 'terrain',
    name: 'Terrain',
    url:
      'https://{s}.tile.opentopomap.org/{z}/{y}/{x}.png',
    attribution:
      'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
    maxZoom: 17,
  },
};


/*
|--------------------------------------------------------------------------
| SATELLITE LABEL / REFERENCE LAYERS
|--------------------------------------------------------------------------
|
| These layers are transparent.
|
| They sit ON TOP of the satellite imagery.
|
*/

/*
 * Places + administrative boundaries
 */
export const SATELLITE_LABEL_LAYER = {
  id: 'satellite-labels',

  name: 'Places & Boundaries',

  url:
    'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',

  attribution:
    'Labels & boundaries: Esri',

  maxZoom: 19,
};


/*
 * Roads + road names
 */
export const SATELLITE_ROAD_LABEL_LAYER = {
  id: 'satellite-roads',

  name: 'Roads & Road Names',

  url:
    'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',

  attribution:
    'Transportation reference: Esri',

  maxZoom: 19,
};


/*
|--------------------------------------------------------------------------
| MAP DEFAULT
|--------------------------------------------------------------------------
*/

export const MAP_DEFAULT = {
  center: [25.9, 91.9],
  zoom: 8,
  boundsPadding: 40,
};


/*
|--------------------------------------------------------------------------
| DEMO FLEET
|--------------------------------------------------------------------------
*/

export const DEMO_FLEET = [
  {
    id: 'NER-01',
    name: 'NER-01',
    label: 'DEMO FLEET',
    source: 'hackathon_simulation',
    status: 'en_route',
    position: [26.1445, 91.7362],
  },

  {
    id: 'NER-02',
    name: 'NER-02',
    label: 'DEMO FLEET',
    source: 'hackathon_simulation',
    status: 'idle',
    position: [26.1062, 91.5859],
  },

  {
    id: 'NER-03',
    name: 'NER-03',
    label: 'DEMO FLEET',
    source: 'hackathon_simulation',
    status: 'diverted',
    position: [26.1480, 91.6705],
  },
];