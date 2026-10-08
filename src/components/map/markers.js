import L from 'leaflet';

function pinSvg(color, letter) {
  return `
    <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z" fill="${color}"/>
      <circle cx="16" cy="15" r="8" fill="white"/>
      <text x="16" y="19" text-anchor="middle" font-size="11" font-weight="700" fill="${color}" font-family="Segoe UI, sans-serif">${letter}</text>
    </svg>`;
}

function truckSvg(color = '#2563eb') {
  return `
    <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="13" fill="white" stroke="${color}" stroke-width="2"/>
      <path d="M6 16V10h9v6H6zm9 0h3.5l2.5-3H15v3z" fill="${color}"/>
      <circle cx="9" cy="18.5" r="1.6" fill="#0f172a"/>
      <circle cx="18" cy="18.5" r="1.6" fill="#0f172a"/>
    </svg>`;
}

function incidentSvg(color) {
  return `
    <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
      <circle cx="13" cy="13" r="12" fill="${color}" stroke="white" stroke-width="2"/>
      <path d="M13 7v7" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="13" cy="18" r="1.3" fill="white"/>
    </svg>`;
}

export const originIcon = L.divIcon({
  className: '',
  html: pinSvg('#0f766e', 'A'),
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -36],
});

export const destinationIcon = L.divIcon({
  className: '',
  html: pinSvg('#dc2626', 'B'),
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -36],
});

export function vehicleIcon(isDemo = false) {
  return L.divIcon({
    className: '',
    html: truckSvg(isDemo ? '#d97706' : '#2563eb'),
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -12],
  });
}

export function incidentIcon(severity = 'MODERATE') {
  const color =
    severity === 'BLOCKED' || severity === 'HIGH'
      ? '#dc2626'
      : severity === 'MODERATE'
        ? '#d97706'
        : '#059669';
  return L.divIcon({
    className: '',
    html: incidentSvg(color),
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export const blockageIcon = L.divIcon({
  className: '',
  html: `
    <div style="width:22px;height:22px;background:#dc2626;border:2px solid white;border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;">
      <span style="color:white;font-size:10px;font-weight:800;">■</span>
    </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});
