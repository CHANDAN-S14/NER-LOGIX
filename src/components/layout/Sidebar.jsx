import { useEffect } from 'react';
import {
  Route,
  AlertTriangle,
  Truck,
  CloudSun,
  ShieldAlert,
  Activity,
  X,
  MapPin,
} from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import Badge from '../common/Badge';
import RoutePlanner from '../route/RoutePlanner';
import RouteCards from '../route/RouteCards';
import AiRiskPanel from '../risk/AiRiskPanel';
import TelemetryPanel from '../telemetry/TelemetryPanel';
import VehiclePanel from '../vehicles/VehiclePanel';
import IncidentPanel from '../incidents/IncidentPanel';
import RoadBlockagePanel from '../incidents/RoadBlockagePanel';
import WeatherPanel from '../telemetry/WeatherPanel';

const TABS = [
  { id: 'planner', label: 'Route', icon: Route },
  { id: 'risk', label: 'Risk', icon: Activity },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'roads', label: 'Roads', icon: ShieldAlert },
  { id: 'weather', label: 'Weather', icon: CloudSun },
];

export default function Sidebar() {
  const { activePanel, setActivePanel, sidebarOpen, setSidebarOpen, isBackendLive } =
    useAppData();

  // Accessibility: close on Escape key when drawer is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen, setSidebarOpen]);

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar backdrop"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden cursor-pointer"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        id="app-sidebar"
        role="region"
        aria-label="Corridor Intelligence Control Panel"
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,22.5rem)] flex-col border-r border-slate-200 bg-panel shadow-2xl transition-all duration-300 ease-in-out lg:static lg:z-0 lg:w-[22.5rem] lg:translate-x-0 lg:shadow-none xl:w-[24rem] ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand strip / Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3.5 py-3 sm:px-4 sm:py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 shadow-sm">
              <svg width="18" height="18" viewBox="0 0 64 64" fill="none" aria-hidden>
                <circle cx="32" cy="32" r="18" stroke="#ECFDF5" strokeWidth="5" fill="none" />
                <circle cx="32" cy="32" r="6" fill="#ECFDF5" />
              </svg>
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm sm:text-base font-bold text-slate-900">NER-LOGIX AI</h1>
                <Badge variant={isBackendLive ? 'live' : 'offline'} dot pulse={isBackendLive} className="text-[10px]">
                  {isBackendLive ? 'Live' : 'Offline'}
                </Badge>
              </div>
              <p className="truncate text-[10px] sm:text-[11px] text-slate-400">
                Corridor risk engine · Northeast India
              </p>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab nav */}
        <nav
          className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 ner-scroll"
          aria-label="Panel tabs"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActivePanel(id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors min-h-[38px] ${
                activePanel === id
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>

        {/* Scrollable content */}
        <div className="ner-scroll flex-1 space-y-4 sm:space-y-5 overflow-y-auto p-3 sm:p-4">
          {activePanel === 'planner' && (
            <>
              <RoutePlanner />
              <RouteCards />
              <AiRiskPanel />
              <TelemetryPanel />
            </>
          )}
          {activePanel === 'risk' && (
            <>
              <AiRiskPanel />
              <TelemetryPanel />
            </>
          )}
          {activePanel === 'incidents' && <IncidentPanel />}
          {activePanel === 'roads' && <RoadBlockagePanel />}
          {activePanel === 'vehicles' && <VehiclePanel />}
          {activePanel === 'weather' && <WeatherPanel />}
        </div>

        {/* Mobile footer hint: View Map button */}
        <div className="border-t border-slate-200 bg-slate-50 p-2.5 text-center lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 min-h-[40px]"
          >
            <MapPin className="h-3.5 w-3.5 text-brand-600" />
            View Live Map
          </button>
        </div>
      </aside>
    </>
  );
}
