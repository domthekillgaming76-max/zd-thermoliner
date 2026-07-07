import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import type { FreightOffer } from '../../lib/freightTypes';
import { formatFreightCurrency } from '../../lib/freightTypes';

interface FreightAcceptModalProps {
  open: boolean;
  offer: FreightOffer | null;
  drivers: { id: string; name: string; truck_id: string | null }[];
  trucks: { id: string; label: string }[];
  trailers: { id: string; label: string }[];
  saving: boolean;
  onClose: () => void;
  onAccept: (input: { driverId?: string; truckId?: string; trailerId?: string }) => void;
}

export function FreightAcceptModal({
  open, offer, drivers, trucks, trailers, saving, onClose, onAccept,
}: FreightAcceptModalProps) {
  const [driverId, setDriverId] = useState('');
  const [truckId, setTruckId] = useState('');
  const [trailerId, setTrailerId] = useState('');

  useEffect(() => {
    if (!open) return;
    setDriverId('');
    setTruckId('');
    setTrailerId('');
  }, [open, offer?.id]);

  useEffect(() => {
    if (!driverId) return;
    const d = drivers.find(dr => dr.id === driverId);
    if (d?.truck_id && !truckId) setTruckId(d.truck_id);
  }, [driverId, drivers, truckId]);

  if (!open || !offer) return null;

  const profit = offer.profitability;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="freight-glass rounded-2xl w-full max-w-md">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-bold text-white">Accepter l&apos;offre</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="freight-profit-bar rounded-xl p-3">
            <p className="font-bold text-white">{offer.departure_city} → {offer.arrival_city}</p>
            <p className="text-xs text-white/40 mt-1">{offer.cargo ?? '—'} · {offer.distance_km} km</p>
            <p className="text-lg font-black text-red-400 mt-2">{formatFreightCurrency(offer.price)}</p>
            {profit && (
              <p className="text-xs text-emerald-400 mt-1">
                Profit net {formatFreightCurrency(profit.net_profit)} · Marge {profit.margin_percent.toFixed(1)}%
              </p>
            )}
          </div>

          <p className="text-xs text-white/40">
            Une mission transport sera créée automatiquement. Assignez un chauffeur pour notifier et générer la feuille de route.
          </p>

          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase mb-1">Chauffeur</label>
            <select className="erp-select w-full" value={driverId} onChange={e => setDriverId(e.target.value)}>
              <option value="">— Sans chauffeur (mission planifiée) —</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase mb-1">Camion</label>
            <select className="erp-select w-full" value={truckId} onChange={e => setTruckId(e.target.value)}>
              <option value="">— Auto / non assigné —</option>
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
              {saving ? 'Création…' : 'Accepter & créer mission'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
