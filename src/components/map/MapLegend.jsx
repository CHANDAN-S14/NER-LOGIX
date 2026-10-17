import { useAppData } from '../../context/AppDataContext';

export default function MapLegend() {
  const { routes, sidebarOpen } = useAppData();
  const hasActiveRoutes =
    routes?.status === 'success' &&
    Array.isArray(routes?.data) &&
    routes.data.length > 0 &&
    !sidebarOpen;

  const items = [
    { color: 'bg-safe', shape: 'rounded-full', label: 'Safe' },
    { color: 'bg-warn', shape: 'rounded-full', label: 'Moderate' },
    { color: 'bg-danger ring-2 ring-red-200', shape: 'rounded-full', label: 'High Risk' },
    { color: 'bg-danger', shape: 'rounded-sm', label: 'Blocked' },
    { color: 'bg-info', shape: 'rounded-full', label: 'Fleet Unit' },
    { color: 'bg-warn', shape: 'rounded-full', label: 'Demo Fleet', outline: true },
  ];

  return (
    <div
      className={`absolute bottom-2.5 sm:bottom-4 left-1/2 z-[1000] max-w-[calc(100%-1rem)] sm:max-w-[95%] -translate-x-1/2 flex-wrap items-center justify-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white/95 px-2.5 py-1.5 sm:px-4 sm:py-2.5 shadow-md backdrop-blur-sm ${
        hasActiveRoutes ? 'hidden lg:flex' : 'flex'
      }`}
    >
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1 sm:gap-1.5">
          <span
            className={`h-2 w-2 sm:h-2.5 sm:w-2.5 ${item.shape} ${item.color} ${item.outline ? 'ring-2 ring-amber-300' : ''}`}
          />
          <span className="whitespace-nowrap text-[10px] sm:text-[11px] font-medium text-slate-600">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
