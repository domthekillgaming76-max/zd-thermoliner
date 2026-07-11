import { Gauge, Fuel, Settings2, BadgeCheck, Euro, Truck } from 'lucide-react';
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
      className="clovis-truck-card group relative rounded-2xl overflow-hidden border border-white/8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col"
      style={{
        background: `linear-gradient(155deg, ${accent}12 0%, rgba(8,8,8,0.98) 55%, rgba(8,8,8,1) 100%)`,
        boxShadow: `0 0 0 1px ${accent}22, 0 16px 40px rgba(0,0,0,0.45)`,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1 opacity-80 z-10"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      <div className="relative aspect-[16/10] overflow-hidden bg-black/40">
        {item.photo_url ? (
          <img
            src={item.photo_url}
            alt={item.label}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${accent}22, rgba(8,8,8,0.9))` }}
          >
            <Truck className="w-16 h-16 opacity-30" style={{ color: accent }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent" />
        {item.badge && (
          <span
            className="absolute top-3 left-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: `${accent}dd`, color: '#fff', border: `1px solid ${accent}` }}
          >
            {item.badge}
          </span>
        )}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-lg font-black text-white leading-tight drop-shadow-lg">{item.label}</h3>
          <p className="text-xs text-white/70 mt-0.5">
            {item.brand} {item.model}{item.variant ? ` · ${item.variant}` : ''}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col">
        {item.description && (
          <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{item.description}</p>
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

        <div className="flex items-end justify-between pt-2 border-t border-white/6 mt-auto">
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Tarif journalier</p>
            <p className="text-2xl font-black text-white flex items-center gap-1">
              <Euro className="w-5 h-5 text-amber-400" />
              {fmtEuro(item.daily_rate)}
              <span className="text-xs font-normal text-white/30">/ jour</span>
            </p>
            <p className="text-[9px] text-white/25 mt-0.5">Facturé sur le compte entreprise</p>
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
