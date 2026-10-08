import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { searchLocations } from '../../services/geocode';

/**
 * Nominatim-backed location search with suggestions.
 * Does NOT auto-overwrite with GPS — parent controls that via USE MY LOCATION.
 */
export default function LocationSearch({
  value = '',
  placeholder = 'Search location…',
  onSelect,
  onClear,
  icon: Icon = MapPin,
  iconClass = 'text-brand-600',
  disabled = false,
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchLocations(query.trim());
        setSuggestions(results);
        setOpen(true);
      } catch {
        setError('Search unavailable');
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
        <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
        <input
          type="text"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-brand-600" />}
        {!loading && query && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              onClear?.();
            }}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-fade-in">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-brand-50"
                onClick={() => {
                  setQuery(s.label);
                  setOpen(false);
                  onSelect?.(s);
                }}
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                <span className="line-clamp-2 text-slate-700">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-1 text-[11px] text-danger">{error}</p>
      )}
    </div>
  );
}
