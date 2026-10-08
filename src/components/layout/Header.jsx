import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import Badge from '../common/Badge';
import Button from '../common/Button';

export default function Header() {
  const {
    backendStatus,
    socketStatus,
    aiStatus,
    sidebarOpen,
    setSidebarOpen,
    isBackendLive,
  } = useAppData();

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 sm:px-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label={sidebarOpen ? 'Close panel' : 'Open panel'}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 shadow-sm">
            <svg width="18" height="18" viewBox="0 0 64 64" fill="none" aria-hidden>
              <circle cx="32" cy="32" r="18" stroke="#ECFDF5" strokeWidth="5" fill="none" />
              <circle cx="32" cy="32" r="6" fill="#ECFDF5" />
            </svg>
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight text-slate-900 sm:text-base">
              NER-LOGIX AI
            </p>
            <p className="hidden text-[10px] text-slate-400 sm:block">
              Logistics & Accessibility Intelligence
            </p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Badge
          variant={isBackendLive ? 'live' : 'offline'}
          dot
          pulse={isBackendLive}
          className="hidden sm:inline-flex"
        >
          {isBackendLive ? 'LIVE SYSTEM' : 'OFFLINE'}
        </Badge>

        <div className="hidden items-center gap-1.5 md:flex">
          <Badge variant={socketStatus === 'live' ? 'live' : 'muted'} className="!px-2">
            Socket {socketStatus === 'live' ? 'Live' : 'Off'}
          </Badge>
          <Badge variant={aiStatus === 'live' ? 'brand' : 'offline'} className="!px-2">
            AI {aiStatus === 'live' ? 'Live' : 'Offline'}
          </Badge>
          <Badge variant="demo" className="!px-2">
            Demo Fleet
          </Badge>
        </div>
      </div>

      <span className="sr-only">Backend {backendStatus}</span>
    </header>
  );
}