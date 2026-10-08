import {
  Route,
  AlertTriangle,
  Truck,
  CloudSun,
  ShieldAlert,
  Activity,
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

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100%,22rem)] flex-col border-r border-slate-200 bg-panel transition-transform duration-300 lg:static lg:z-0 lg:w-[22.5rem] lg:translate-x-0 xl:w-[24rem] ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand strip (sidebar header matching Stitch) */}
        <div className="border-b border-slate-200 bg-white px-4 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700">
              <svg width="20" height="20" viewBox="0 0 64 64" fill="none" aria-hidden>
                <circle cx="32" cy="32" r="18" stroke="#ECFDF5" strokeWidth="5" fill="none" />
                <circle cx="32" cy="32" r="6" fill="#ECFDF5" />
              </svg>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900">NER-LOGIX AI</h1>
                <Badge variant={isBackendLive ? 'live' : 'offline'} dot pulse={isBackendLive}>
                  {isBackendLive ? 'Live' : 'Offline'}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400">
                Real-time corridor risk engine · Northeast India
              </p>
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 ner-scroll">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActivePanel(id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                activePanel === id
                  ? 'bg-brand-700 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>

        {/* Scrollable content */}
        <div className="ner-scroll flex-1 space-y-5 overflow-y-auto p-4">
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
      </aside>
    </>
  );
}
