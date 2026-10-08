import { RISK_LEVELS } from '../services/config';

export function normalizeRiskLevel(value) {
  if (value == null) return null;
  const v = String(value).toLowerCase().replace(/\s+/g, '_');
  if (['low', 'safe', 'safe_corridor'].includes(v)) return RISK_LEVELS.LOW;
  if (['moderate', 'mod', 'medium', 'warning'].includes(v)) return RISK_LEVELS.MODERATE;
  if (['high', 'danger', 'severe'].includes(v)) return RISK_LEVELS.HIGH;
  if (['blocked', 'blockage', 'closed'].includes(v)) return RISK_LEVELS.BLOCKED;
  return v;
}

export function riskBadgeClasses(level) {
  const n = normalizeRiskLevel(level);
  switch (n) {
    case RISK_LEVELS.LOW:
      return 'bg-safe-soft text-safe border-emerald-200';
    case RISK_LEVELS.MODERATE:
      return 'bg-warn-soft text-warn border-amber-200';
    case RISK_LEVELS.HIGH:
      return 'bg-danger-soft text-danger border-red-200';
    case RISK_LEVELS.BLOCKED:
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

export function riskPolylineColor(level) {
  const n = normalizeRiskLevel(level);
  switch (n) {
    case RISK_LEVELS.LOW:
      return '#059669';
    case RISK_LEVELS.MODERATE:
      return '#d97706';
    case RISK_LEVELS.HIGH:
      return '#dc2626';
    case RISK_LEVELS.BLOCKED:
      return '#7f1d1d';
    default:
      return '#64748b';
  }
}

export function formatRiskLabel(level) {
  const n = normalizeRiskLevel(level);
  if (!n) return 'Unknown';
  return n.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDistanceKm(metersOrKm, unitHint) {
  if (metersOrKm == null || Number.isNaN(Number(metersOrKm))) return null;
  const n = Number(metersOrKm);
  // Heuristic: values > 200 are likely meters
  const km = unitHint === 'm' || (unitHint == null && n > 200) ? n / 1000 : n;
  return `${km.toFixed(1)} km`;
}

export function formatDurationMin(secondsOrMin, unitHint) {
  if (secondsOrMin == null || Number.isNaN(Number(secondsOrMin))) return null;
  const n = Number(secondsOrMin);
  const min = unitHint === 's' || (unitHint == null && n > 180) ? Math.round(n / 60) : Math.round(n);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
