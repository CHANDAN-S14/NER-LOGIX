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
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-4 lg:hidden shrink-0 z-30">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label={sidebarOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        > 
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link to="/" className="flex items-center gap-2 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 shadow-sm">
            <svg width="16" height="16" viewBox="0 0 64 64" fill="none" aria-hidden>
              <circle cx="32" cy="32" r="18" stroke="#ECFDF5" strokeWidth="5" fill="none" />
              <circle cx="32" cy="32" r="6" fill="#ECFDF5" />
            </svg>
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-bold tracking-tight text-slate-900">
              NER-LOGIX AI
            </p>
            <p className="hidden text-[10px] text-slate-400 sm:block truncate">
              Corridor Intelligence
            </p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <Badge
          variant={isBackendLive ? 'live' : 'offline'}
          dot
          pulse={isBackendLive}
          className="text-[10px] px-2 py-0.5"
        >
          {isBackendLive ? 'Live' : 'Offline'}
        </Badge>
      </div>
    </header>
  );
}