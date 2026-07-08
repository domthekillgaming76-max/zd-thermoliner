import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import {
  filterCitySuggestions,
  isValidCityInput,
  normalizeCity,
  rememberCustomCity,
} from '../../lib/citySuggestions';

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
  inputClassName?: string;
}

export function CityAutocomplete({
  value,
  onChange,
  label,
  placeholder = 'Saisir une ville (ETS2, ATS ou réelle)',
  required = false,
  inputClassName = 'erp-input',
}: CityAutocompleteProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = useMemo(
    () => filterCitySuggestions(value, 10),
    [value],
  );

  const normalized = normalizeCity(value);
  const showCustomHint =
    normalized.length >= 2 &&
    !suggestions.some(s => s.toLowerCase() === normalized.toLowerCase());

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function commitCity(city: string) {
    const next = normalizeCity(city);
    onChange(next);
    rememberCustomCity(next);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const total = suggestions.length + (showCustomHint ? 1 : 0);
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % Math.max(total, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev <= 0 ? total - 1 : prev - 1));
    } else if (e.key === 'Enter' && open && activeIndex >= 0) {
      e.preventDefault();
      if (activeIndex < suggestions.length) {
        commitCity(suggestions[activeIndex]);
      } else if (showCustomHint) {
        commitCity(normalized);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
        <input
          type="text"
          list={listId}
          required={required}
          value={value}
          onChange={e => {
            onChange(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            if (isValidCityInput(value)) rememberCustomCity(value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${inputClassName} pl-9`}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <datalist id={listId}>
        {suggestions.map(city => (
          <option key={city} value={city} />
        ))}
      </datalist>

      {open && (suggestions.length > 0 || showCustomHint) && (
        <ul
          className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-xl shadow-2xl border border-white/10"
          style={{ background: '#141414' }}
          role="listbox"
        >
          {suggestions.map((city, index) => (
            <li key={city}>
              <button
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                onMouseDown={e => e.preventDefault()}
                onClick={() => commitCity(city)}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                  activeIndex === index
                    ? 'bg-red-500/15 text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {city}
              </button>
            </li>
          ))}
          {showCustomHint && (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={activeIndex === suggestions.length}
                onMouseDown={e => e.preventDefault()}
                onClick={() => commitCity(normalized)}
                className={`w-full text-left px-3 py-2.5 text-sm border-t border-white/5 ${
                  activeIndex === suggestions.length
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : 'text-emerald-400/80 hover:bg-emerald-500/10'
                }`}
              >
                Utiliser « {normalized} »
              </button>
            </li>
          )}
        </ul>
      )}

      {value && !isValidCityInput(value) && (
        <p className="text-[10px] text-amber-400/80 mt-1">Minimum 2 caractères pour la ville.</p>
      )}
    </div>
  );
}
