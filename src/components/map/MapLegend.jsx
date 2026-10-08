export default function MapLegend() {
  const items = [
    { color: 'bg-safe', shape: 'rounded-full', label: 'Safe' },
    { color: 'bg-warn', shape: 'rounded-full', label: 'Moderate' },
    { color: 'bg-danger ring-2 ring-red-200', shape: 'rounded-full', label: 'High Risk' },
    { color: 'bg-danger', shape: 'rounded-sm', label: 'Blocked' },
    { color: 'bg-info', shape: 'rounded-full', label: 'Fleet Unit' },
    { color: 'bg-warn', shape: 'rounded-full', label: 'Demo Fleet', outline: true },
  ];

  return (
    <div className="absolute bottom-4 left-1/2 z-[1000] flex max-w-[95%] -translate-x-1/2 flex-wrap items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-2.5 shadow-md backdrop-blur-sm">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className={`h-2.5 w-2.5 ${item.shape} ${item.color} ${item.outline ? 'ring-2 ring-amber-300' : ''}`}
          />
          <span className="whitespace-nowrap text-[11px] font-medium text-slate-600">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
