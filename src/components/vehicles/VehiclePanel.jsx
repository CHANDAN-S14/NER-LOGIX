import { Truck } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import Badge from '../common/Badge';
import StatusBanner from '../common/StatusBanner';
import Card, { CardHeader } from '../common/Card';

export default function VehiclePanel() {
  const { demoFleet, liveVehicles, vehicles, isBackendLive } = useAppData();

  return (
    <section className="animate-fade-in space-y-4">
      {/* Demo fleet — always labeled */}
      <Card>
        <CardHeader
          title="Demo Fleet"
          action={<Badge variant="demo">Hackathon Simulation</Badge>}
        />
        <p className="mb-3 text-[11px] text-amber-700">
          These units are for demonstration only. They are not live telemetry.
        </p>
        <ul className="space-y-2">
          {demoFleet.map((v) => (
            <li
              key={v.id}
              className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2.5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-amber-700 shadow-sm">
                <Truck className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">{v.name}</p>
                <p className="text-[11px] text-slate-500">
                  {v.status} · {v.position[0].toFixed(3)}, {v.position[1].toFixed(3)}
                </p>
              </div>
              <Badge variant="demo">DEMO</Badge>
            </li>
          ))}
        </ul>
      </Card>

      {/* Live vehicles from backend */}
      <Card>
        <CardHeader
          title="Live Vehicles"
          action={
            <Badge variant={isBackendLive ? 'live' : 'offline'} dot>
              {isBackendLive ? 'Backend' : 'Offline'}
            </Badge>
          }
        />

        {vehicles.status === 'loading' && (
          <StatusBanner type="loading" title="Loading vehicles…" />
        )}
        {vehicles.status === 'error' && (
          <StatusBanner
            type="error"
            title="Unable to load vehicles"
            message={vehicles.error}
          />
        )}
        {vehicles.status === 'success' && liveVehicles.length === 0 && (
          <StatusBanner
            type="empty"
            title="No live vehicles"
            message="Backend returned no tracked units. Demo fleet is shown separately above."
          />
        )}
        {liveVehicles.length > 0 && (
          <ul className="space-y-2">
            {liveVehicles.map((v) => (
              <li
                key={v.id || v._id || v.name}
                className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info-soft text-info">
                  <Truck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">
                    {v.name || v.id || v._id}
                  </p>
                  <p className="text-[11px] text-slate-500">{v.status || 'Tracked'}</p>
                </div>
                <Badge variant="live" dot>
                  LIVE
                </Badge>
              </li>
            ))}
          </ul>
        )}
        {!isBackendLive && vehicles.status !== 'loading' && (
          <StatusBanner
            type="offline"
            title="No telemetry source"
            message="Connect the backend to receive live vehicle positions."
            className="mt-2"
          />
        )}
      </Card>
    </section>
  );
}
