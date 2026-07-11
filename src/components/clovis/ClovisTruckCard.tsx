import { Truck, Gauge, Fuel, Settings2, BadgeCheck, Euro } from 'lucide-react';
import { fmtEuro } from '../../lib/format';
import type { ClovisCatalogItem } from '../../lib/clovisRentalTypes';

interface ClovisTruckCardProps {
  item: ClovisCatalogItem;
  disabled?: boolean;
  renting?: boolean;
  onRent: () => void;
}

export function ClovisTruckCard({ item, disabled, renting, onRent }: ClovisTruckCardProps) {
  const accent = item.accent_color || '#f59e0b';

  return (
    <article
      className="clovis-truck-card group relative rounded-2xl overflow-hidden border border-white/8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
      style={{
        background: `linear-gradient(155deg, ${accent}18 0%, rgba(8,8,8,0.98) 45%, rgba(8,8,8,1) 100%)`,
        boxShadow: `0 0 0 1px ${accent}22, 0 16px 40px rgba(0,0,0,0.45)`,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1 opacity-80"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            {item.badge && (
              <span
                className="inline-flex text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2"
                style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}
              >
                {item.badge}
              </span>
            )}
            <h3 className="text-lg font-black text-white leading-tight">{item.label}</h3>
            <p className="text-xs text-white/40 mt-0.5">
              {item.brand} {item.model}{item.variant ? ` · ${item.variant}` : ''}
            </p>
          </div>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}
          >
            <Truck className="w-6 h-6" style={{ color: accent }} />
          </div>
        </div>

        {item.description && (
          <p className="text-xs text-white/50 leading-relaxed line-clamp-3">{item.description}</p>
        )}

        <div className="grid grid-cols-2 gap-2 text-[10px]">
          {item.power_hp && (
            <div className="flex items-center gap-1.5 text-white/35">
              <Gauge className="w-3 h-3" /> {item.power_hp} ch
            </div>
          )}
          {item.fuel_type && (
            <div className="flex items-center gap-1.5 text-white/35">
              <Fuel className="w-3 h-3" /> {item.fuel_type}
            </div>
          )}
          {item.transmission && (
            <div className="flex items-center gap-1.5 text-white/35 col-span-2">
              <Settings2 className="w-3 h-3" /> {item.transmission}
            </div>
          )}
        </div>

        <div className="flex items-end justify-between pt-2 border-t border-white/6">
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Tarif journalier</p>
            <p className="text-2xl font-black text-white flex items-center gap-1">
              <Euro className="w-5 h-5 text-amber-400" />
              {fmtEuro(item.daily_rate)}
              <span className="text-xs font-normal text-white/30">/ jour</span>
            </p>
          </div>
          <button
            type="button"
            disabled={disabled || renting}
            onClick={onRent}
            className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-40 flex items-center gap-1.5"
          >
            <BadgeCheck className="w-3.5 h-3.5" />
            {renting ? 'Contrat…' : 'Louer'}
          </button>
        </div>
      </div>
    </article>
  );
}
