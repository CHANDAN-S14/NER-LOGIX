import { useAppData } from '../../context/AppDataContext';
import Badge from '../common/Badge';
import StatusBanner from '../common/StatusBanner';
import { formatRiskLabel, normalizeRiskLevel, riskBadgeClasses } from '../../utils/risk';
import { CONNECTION } from '../../services/config';

function RiskGauge({ score }) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (clamped / 100) * circumference;
  const level =
    clamped <= 33 ? 'low' : clamped <= 66 ? 'moderate' : 'high';
  const stroke =
    level === 'low' ? '#059669' : level === 'moderate' ? '#d97706' : '#dc2626';

  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
        <span className="text-2xl font-bold text-slate-900">{clamped}</span>
        <span className="text-[10px] font-medium text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

export default function AiRiskPanel() {
  const { risk, aiStatus, isAiLive } = useAppData();

  return (
    <section className="animate-fade-in rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          AI Road Risk Analysis
        </h2>
        <Badge
          variant={isAiLive ? 'live' : 'offline'}
          dot
          pulse={isAiLive}
        >
          {isAiLive ? 'Live Model Output' : 'AI Offline'}
        </Badge>
      </div>

      {risk.status === 'idle' && (
        <StatusBanner
          type={aiStatus === CONNECTION.OFFLINE ? 'offline' : 'empty'}
          title={aiStatus === CONNECTION.OFFLINE ? 'AI SERVICE OFFLINE' : 'No analysis yet'}
          message={
            aiStatus === CONNECTION.OFFLINE
              ? 'AI analysis unavailable until the service connects.'
              : 'Plan a route to request AI risk analysis from the service.'
          }
        />
      )}

      {risk.status === 'loading' && (
        <StatusBanner
          type="loading"
          title="Analyzing corridor…"
          message="Rule-based risk engine evaluating weather, incidents, and road state."
        />
      )}

      {risk.status === 'error' && (
        <StatusBanner
          type="offline"
          title="AI ANALYSIS UNAVAILABLE"
          message={risk.error || 'AI service is offline. No risk values are shown.'}
        />
      )}

      {risk.status === 'success' && risk.data && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {(risk.data.riskScore != null || risk.data.risk_score != null || risk.data.score != null) && (
              <RiskGauge
                score={risk.data.riskScore ?? risk.data.risk_score ?? risk.data.score}
              />
            )}
            <div className="min-w-0 flex-1">
              {(risk.data.riskLevel || risk.data.risk_level || risk.data.level) && (
                <span
                  className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${riskBadgeClasses(
                    risk.data.riskLevel || risk.data.risk_level || risk.data.level
                  )}`}
                >
                  {formatRiskLabel(
                    risk.data.riskLevel || risk.data.risk_level || risk.data.level
                  )}
                  {normalizeRiskLevel(risk.data.riskLevel || risk.data.level) === 'low'
                    ? ' Corridor'
                    : ''}
                </span>
              )}
              {risk.data.accessibility && (
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  Accessibility: {risk.data.accessibility}
                </p>
              )}
              {(risk.data.summary || risk.data.recommendation) && (
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {risk.data.summary || risk.data.recommendation}
                </p>
              )}
            </div>
          </div>

          {/* Reasons */}
          {Array.isArray(risk.data.reasons) && risk.data.reasons.length > 0 && (
            <ul className="space-y-1.5">
              {risk.data.reasons.map((reason, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-slate-600"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                  {typeof reason === 'string' ? reason : reason.label || reason.text}
                </li>
              ))}
            </ul>
          )}

          {/* Factor bars — only if AI returns factors */}
          {Array.isArray(risk.data.factors) && risk.data.factors.length > 0 && (
            <div className="space-y-2.5">
              {risk.data.factors.map((f, i) => {
                const label = f.label || f.name || `Factor ${i + 1}`;
                const value = Number(f.value ?? f.percent ?? f.weight ?? 0);
                return (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="font-medium text-slate-600">{label}</span>
                      <span className="text-slate-500">{value}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-400 transition-all duration-500"
                        style={{ width: `${Math.min(100, value)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {risk.data.recommendation && risk.data.summary && (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Recommendation: </span>
              {risk.data.recommendation}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
