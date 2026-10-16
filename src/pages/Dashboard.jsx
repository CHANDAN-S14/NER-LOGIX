import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import LiveMap from '../components/map/LiveMap';

/**
 * Main map-centric dashboard — Stitch-inspired layout.
 * Left control panel + live GIS map.
 */
export default function Dashboard() {
  return (
    <div className="flex h-screen h-[100dvh] w-full flex-col bg-canvas overflow-hidden">
      <Header />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="relative h-full min-h-0 min-w-0 flex-1">
          <LiveMap />
        </main>
      </div>
    </div>
  );
}
