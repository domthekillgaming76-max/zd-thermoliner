import {
  MapPin, Snowflake, AlertTriangle, Zap, TrendingUp, Clock,
  Check, Copy, Trash2, Edit3, UserPlus, Loader2,
} from 'lucide-react';
import type { FreightOffer } from '../../lib/freightTypes';
import {
  FREIGHT_PRIORITY_LABELS,
  FREIGHT_STATUS_COLORS,
  FREIGHT_STATUS_LABELS,
  formatFreightCurrency,
  timeUntilExpiry,
} from '../../lib/freightTypes';

interface FreightOfferCardProps {
  offer: FreightOffer;
  canManage?: boolean;
  isDriver?: boolean;
  busy?: boolean;
  onAccept?: () => void;
  onRequest?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
}

export function FreightOfferCard({
  offer: o,
  canManage,
  isDriver,
  busy,
  onAccept,
  onRequest,
  onEdit,
  onDuplicate,
  onDelete,
  onCancel,
}: FreightOfferCardProps) {
  const profit = o.profitability;
  const isAvailable = o.status === 'available';

  return (
    <article className="freight-offer-card rounded-2xl p-4 flex flex-col gap-3 freight-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-white/35 font-semibold truncate">{o.client_name ?? 'Client Z&D'}</p>
          <div className="flex items-center gap-2 mt-1">
            <MapPin className="w-4 h-4 text-red-400 shrink-0" />
            <p className="font-bold text-white truncate">{o.departure_city} → {o.arrival_city}</p>
          </div>
          <p className="text-xs text-white/40 mt-0.5 truncate">{o.cargo ?? '—'}</p>
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-full border font-bold shrink-0 ${FREIGHT_STATUS_COLORS[o.status]}`}>
          {FREIGHT_STATUS_LABELS[o.status]}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {o.priority === 'urgent' && (
          <Badge icon={Zap} label="Urgent" className="text-red-400 border-red-500/30 bg-red-500/10" />
        )}
        {o.temperature_required && (
          <Badge icon={Snowflake} label="Frigo" className="text-cyan-400 border-cyan-500/30 bg-cyan-500/10" />
        )}
        {o.adr_required && (
          <Badge icon={AlertTriangle} label="ADR" className="text-amber-400 border-amber-500/30 bg-amber-500/10" />
        )}
        {profit && profit.profit_per_km >= 1.5 && (
          <Badge icon={TrendingUp} label={`${profit.profit_per_km.toFixed(2)} €/km`} className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10" />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Distance" value={`${o.distance_km} km`} />
        <Stat label="Prix" value={formatFreightCurrency(o.price)} highlight />
        <Stat label="€/km" value={`${o.price_per_km.toFixed(2)} €`} />
      </div>

      {profit && (
        <div className="freight-profit-bar rounded-xl px-3 py-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
          <span className="text-white/40">Profit net <b className="text-emerald-400">{formatFreightCurrency(profit.net_profit)}</b></span>
          <span className="text-white/40">Marge <b className="text-white">{profit.margin_percent.toFixed(1)}%</b></span>
          <span className="text-white/40">Carburant {formatFreightCurrency(profit.fuel_cost)}</span>
          <span className="text-white/40">Péages {formatFreightCurrency(profit.toll_estimate)}</span>
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-white/35">
        <span>{FREIGHT_PRIORITY_LABELS[o.priority]}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeUntilExpiry(o.expires_at)}</span>
      </div>

      <div className="flex flex-wrap gap-2 pt-1 mt-auto">
        {canManage && isAvailable && onAccept && (
          <ActionBtn icon={Check} label="Accepter" onClick={onAccept} primary disabled={busy} />
        )}
        {isDriver && isAvailable && onRequest && (
          <ActionBtn icon={UserPlus} label="Demander" onClick={onRequest} primary disabled={busy} />
        )}
        {canManage && onEdit && (
          <ActionBtn icon={Edit3} label="Modifier" onClick={onEdit} disabled={busy} />
        )}
        {canManage && onDuplicate && (
          <ActionBtn icon={Copy} label="Dupliquer" onClick={onDuplicate} disabled={busy} />
        )}
        {canManage && isAvailable && onCancel && (
          <ActionBtn icon={Trash2} label="Annuler" onClick={onCancel} danger disabled={busy} />
        )}
        {canManage && onDelete && (
          <ActionBtn icon={Trash2} label="Supprimer" onClick={onDelete} danger disabled={busy} />
        )}
      </div>
    </article>
  );
}

function Badge({ icon: Icon, label, className }: { icon: typeof Zap; label: string; className: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${className}`}>
      <Icon className="w-3 h-3" />{label}
    </span>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-white/35 uppercase">{label}</p>
      <p className={`text-sm font-bold ${highlight ? 'text-red-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function ActionBtn({
  icon: Icon, label, onClick, primary, danger, disabled,
}: {
  icon: typeof Check; label: string; onClick: () => void; primary?: boolean; danger?: boolean; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
        primary ? 'bg-red-500/15 text-red-400 border border-red-500/25' :
        danger ? 'text-red-400/70 bg-red-500/5 hover:bg-red-500/10' :
        'text-white/50 bg-white/5 hover:bg-white/8'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      {disabled ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
