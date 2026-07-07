import { Link2, Check, Trash2, TrendingUp } from 'lucide-react';
import type { FreightChain } from '../../lib/freightTypes';
import { formatFreightCurrency, FREIGHT_PRIORITY_LABELS } from '../../lib/freightTypes';
import { FreightChainTimeline } from './FreightChainTimeline';

interface FreightChainCardProps {
  chain: FreightChain;
  canManage?: boolean;
  busy?: boolean;
  onAccept?: () => void;
  onCompleteLeg?: () => void;
  onCancel?: () => void;
}

export function FreightChainCard({
  chain, canManage, busy, onAccept, onCompleteLeg, onCancel,
}: FreightChainCardProps) {
  const activeLeg = chain.legs.find(l => l.leg_order === chain.current_leg_order);
  const canComplete = canManage && (chain.status === 'assigned' || chain.status === 'in_progress');
  const totalExpenses = chain.total_fuel_cost + chain.total_toll_estimate + chain.total_salary_estimate
    + chain.total_maintenance_estimate + chain.total_insurance_estimate;

  return (
    <article className="freight-chain-card rounded-2xl p-5 flex flex-col gap-4 freight-card-hover col-span-1 md:col-span-2 xl:col-span-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-bold uppercase text-cyan-400/80">Route chaînée</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/8">
              {chain.legs.length} étapes
            </span>
          </div>
          <h3 className="font-black text-white text-lg mt-1">{chain.title}</h3>
          <p className="text-xs text-white/40">{chain.client_name ?? 'Client Z&D'} · {FREIGHT_PRIORITY_LABELS[chain.priority]}</p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full border font-bold text-blue-400 bg-blue-500/10 border-blue-500/25 shrink-0">
          {chain.status}
        </span>
      </div>

      <FreightChainTimeline legs={chain.legs} currentLegOrder={chain.current_leg_order} />

      <div className="freight-profit-bar rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
        <Stat label="Distance totale" value={`${chain.total_distance_km} km`} />
        <Stat label="Revenu total" value={formatFreightCurrency(chain.total_revenue)} highlight />
        <Stat label="Dépenses est." value={formatFreightCurrency(totalExpenses)} />
        <Stat label="Profit net" value={formatFreightCurrency(chain.total_net_profit)} profit />
      </div>

      <div className="flex items-center gap-2 text-xs text-emerald-400">
        <TrendingUp className="w-4 h-4" />
        Marge {chain.total_margin_percent.toFixed(1)}% · {formatFreightCurrency(chain.total_net_profit / Math.max(chain.total_distance_km, 1))}/km
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {canManage && chain.status === 'available' && onAccept && (
          <button type="button" onClick={onAccept} disabled={busy} className="erp-btn-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold">
            <Check className="w-3.5 h-3.5" />Accepter le tour
          </button>
        )}
        {canComplete && activeLeg && activeLeg.status !== 'delivered' && onCompleteLeg && (
          <button type="button" onClick={onCompleteLeg} disabled={busy} className="erp-btn-secondary flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold">
            <Check className="w-3.5 h-3.5" />Valider étape {chain.current_leg_order}
          </button>
        )}
        {canManage && chain.status === 'available' && onCancel && (
          <button type="button" onClick={onCancel} disabled={busy} className="text-red-400/70 text-xs font-semibold px-3 py-2 flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" />Annuler
          </button>
        )}
      </div>
    </article>
  );
}

function Stat({ label, value, highlight, profit }: { label: string; value: string; highlight?: boolean; profit?: boolean }) {
  return (
    <div>
      <p className="text-white/35 uppercase">{label}</p>
      <p className={`font-bold mt-0.5 ${profit ? 'text-emerald-400' : highlight ? 'text-red-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}
