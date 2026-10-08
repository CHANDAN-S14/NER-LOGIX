export default function Card({
  children,
  className = '',
  padding = true,
  as: Tag = 'div',
  ...props
}) {
  return (
    <Tag
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${padding ? 'p-4' : ''} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`mb-3 flex items-start justify-between gap-2 ${className}`}>
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {title}
        </h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
