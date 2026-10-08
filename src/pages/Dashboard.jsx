import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import LiveMap from '../components/map/LiveMap';

/**
 * Main map-centric dashboard — Stitch-inspired layout.
 * Left control panel + live GIS map.
 */
export default function Dashboard() {
  return (
    <div className="flex h-full min-h-screen flex-col bg-canvas">
      {/* <Header /> */}
      <div className="relative flex min-h-0 flex-1">
        <Sidebar />
        <main className="relative min-w-0 flex-1">
          <LiveMap />
        </main>
      </div>
    </div>
  );
}
