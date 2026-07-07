import { useEffect, useState } from 'react';
import { Check, Link2, X } from 'lucide-react';
import type { FreightChain } from '../../lib/freightTypes';
import { formatFreightCurrency } from '../../lib/freightTypes';
import { FreightChainTimeline } from './FreightChainTimeline';

interface FreightChainAcceptModalProps {
  open: boolean;
  chain: FreightChain | null;
  drivers: { id: string; name: string; truck_id: string | null }[];
  trucks: { id: string; label: string }[];
  trailers: { id: string; label: string }[];
  saving: boolean;
  onClose: () => void;
  onAccept: (input: { driverId?: string; truckId?: string; trailerId?: string }) => void;
}

export function FreightChainAcceptModal({
  open, chain, drivers, trucks, trailers, saving, onClose, onAccept,
}: FreightChainAcceptModalProps) {
  const [driverId, setDriverId] = useState('');
  const [truckId, setTruckId] = useState('');
  const [trailerId, setTrailerId] = useState('');

  useEffect(() => {
    if (!open) return;
    setDriverId('');
    setTruckId('');
    setTrailerId('');
  }, [open, chain?.id]);

  useEffect(() => {
    if (!driverId) return;
    const d = drivers.find(dr => dr.id === driverId);
    if (d?.truck_id && !truckId) setTruckId(d.truck_id);
  }, [driverId, drivers, truckId]);

  if (!open || !chain) return null;

  const totalExpenses = chain.total_fuel_cost + chain.total_toll_estimate + chain.total_salary_estimate
    + chain.total_maintenance_estimate + chain.total_insurance_estimate;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="freight-glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/95 backdrop-blur">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-white">Accepter le tour chaîné</h2>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <h3 className="font-bold text-white">{chain.title}</h3>
            <p className="text-xs text-white/40">{chain.legs.length} étapes · {chain.total_distance_km} km</p>
          </div>

          <FreightChainTimeline legs={chain.legs} />

          <div className="freight-profit-bar rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
            <span className="text-white/40">Revenu <b className="text-red-400">{formatFreightCurrency(chain.total_revenue)}</b></span>
            <span className="text-white/40">Dépenses <b className="text-white">{formatFreightCurrency(totalExpenses)}</b></span>
            <span className="text-white/40 col-span-2">Profit net <b className="text-emerald-400">{formatFreightCurrency(chain.total_net_profit)}</b> ({chain.total_margin_percent.toFixed(1)}%)</span>
          </div>

          <p className="text-xs text-white/40">
            {chain.legs.length} missions seront créées. Seule l&apos;étape 1 sera active — les suivantes se débloquent après livraison.
          </p>

          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase mb-1">Chauffeur (tour complet)</label>
            <select className="erp-select w-full" value={driverId} onChange={e => setDriverId(e.target.value)}>
              <option value="">— Planifier sans chauffeur —</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase mb-1">Camion</label>
            <select className="erp-select w-full" value={truckId} onChange={e => setTruckId(e.target.value)}>
              <option value="">— Non assigné —</option>
              {trucks.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase mb-1">Remorque</label>
            <select className="erp-select w-full" value={trailerId} onChange={e => setTrailerId(e.target.value)}>
              <option value="">— Non assignée —</option>
              {trailers.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 erp-btn-secondary">Annuler</button>
            <button
              type="button"
              disabled={saving}
              onClick={() => onAccept({
                driverId: driverId || undefined,
                truckId: truckId || undefined,
                trailerId: trailerId || undefined,
              })}
              className="flex-1 erp-btn-primary flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Création…' : `Accepter ${chain.legs.length} étapes`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
