/**
 * Central configuration — all env-backed URLs live here.
 * Components must never hardcode localhost.
 */

const trimSlash = (url = '') => url.replace(/\/+$/, '');

export const API_URL = trimSlash(import.meta.env.VITE_API_URL || '');
export const SOCKET_URL = trimSlash(
  import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || ''
);

/** Northeast India default map center (Guwahati corridor) */
export const MAP_DEFAULT = {
  center: [25.9, 91.9],
  zoom: 11,
  boundsPadding: 40,
};

/** Explicitly labeled hackathon demo fleet — NOT live telemetry */
export const DEMO_FLEET = [
  {
    id: 'NER-01',
    name: 'NER-01',
    label: 'DEMO FLEET',
    source: 'hackathon_simulation',
    status: 'en _route',

    // NH-48 — Rajasthan / Western India
    position: [26.9124, 75.7873],
  },

  {
    id: 'NER-02',
    name: 'NER-02',
    label: 'DEMO FLEET',
    source: 'hackathon_simulation',
    status: 'idle',

    // NH-44 — Central India / Nagpur
    position: [21.1458, 79.0882],
  },

  {
    id: 'NER-03',
    name: 'NER-03',
    label: 'DEMO FLEET',
    source: 'hackathon_simulation',
    status: 'diverted',

    // NH-16 — Andhra Pradesh / East Coast
    position: [16.5062, 80.6480],
  },
];
/**
 * Backend roles — consumed from JWT /auth responses.
 * Do not invent additional roles in the UI.
 */
export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  USER: 'USER',
});

export const RISK_LEVELS = Object.freeze({
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  BLOCKED: 'blocked',
});

export const INCIDENT_SEVERITY = Object.freeze({
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  BLOCKED: 'BLOCKED',
});

export const CONNECTION = Object.freeze({
  LIVE: 'live',
  OFFLINE: 'offline',
  CONNECTING: 'connecting',
});

export const DATA_SOURCE = Object.freeze({
  LIVE: 'live',
  DEMO: 'demo',
  OFFLINE: 'offline',
});
