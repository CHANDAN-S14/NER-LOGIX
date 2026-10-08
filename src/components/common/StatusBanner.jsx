import { AlertCircle, WifiOff, Loader2, Inbox } from 'lucide-react';

const presets = {
  loading: {
    icon: Loader2,
    iconClass: 'animate-spin text-brand-600',
    box: 'bg-brand-50 border-brand-100 text-brand-800',
  },
  empty: {
    icon: Inbox,
    iconClass: 'text-slate-400',
    box: 'bg-slate-50 border-slate-100 text-slate-600',
  },
  error: {
    icon: AlertCircle,
    iconClass: 'text-danger',
    box: 'bg-danger-soft border-red-100 text-red-800',
  },
  offline: {
    icon: WifiOff,
    iconClass: 'text-slate-500',
    box: 'bg-slate-50 border-slate-200 text-slate-600',
  },
};

export default function StatusBanner({
  type = 'empty',
  title,
  message,
  className = '',
}) {
  const preset = presets[type] || presets.empty;
  const Icon = preset.icon;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 ${preset.box} ${className}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${preset.iconClass}`} />
      <div className="min-w-0">
        {title && <p className="text-sm font-semibold">{title}</p>}
        {message && <p className="mt-0.5 text-xs leading-relaxed opacity-90">{message}</p>}
      </div>
    </div>
  );
}
