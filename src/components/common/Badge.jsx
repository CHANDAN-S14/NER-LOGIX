const variants = {
  safe: 'bg-safe-soft text-safe border-emerald-200',
  warn: 'bg-warn-soft text-warn border-amber-200',
  danger: 'bg-danger-soft text-danger border-red-200',
  info: 'bg-info-soft text-info border-blue-200',
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
  muted: 'bg-slate-100 text-slate-600 border-slate-200',
  live: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  offline: 'bg-slate-100 text-slate-500 border-slate-200',
  demo: 'bg-amber-50 text-amber-800 border-amber-200',
};

export default function Badge({
  children,
  variant = 'muted',
  className = '',
  dot = false,
  pulse = false,
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${variants[variant] || variants.muted} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full bg-current ${pulse ? 'live-dot' : ''}`}
        />
      )}
      {children}
    </span>
  );
}
