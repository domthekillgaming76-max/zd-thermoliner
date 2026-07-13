import { useEffect, useState } from 'react';
import { Check, Gamepad2, X } from 'lucide-react';
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
  onAccept: (input: { driverId?: string; truckId?: string; trailerId?: string; sendToGame?: boolean }) => void;
}

export function FreightAcceptModal({
  open, offer, drivers, trucks, trailers, saving, onClose, onAccept,
}: FreightAcceptModalProps) {
  const [driverId, setDriverId] = useState('');
  const [truckId, setTruckId] = useState('');
  const [trailerId, setTrailerId] = useState('');
  const [sendToGame, setSendToGame] = useState(true);

  useEffect(() => {
    if (!open) return;
    setDriverId('');
    setTruckId('');
    setTrailerId('');
    setSendToGame(true);
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
            Une mission et une feuille de route seront créées automatiquement pour le chauffeur sélectionné.
          </p>

          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase mb-1">Chauffeur *</label>
            <select className="erp-select w-full" value={driverId} onChange={e => setDriverId(e.target.value)} required>
              <option value="">— Sélectionner un chauffeur —</option>
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

          <label className="flex items-start gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={sendToGame}
              onChange={e => setSendToGame(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-cyan-500"
            />
            <Gamepad2 className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
            <span>
              <span className="block text-sm font-semibold text-white">Préparer dans ETS2 solo</span>
              <span className="block text-[11px] text-white/40 mt-0.5">
                Le launcher recevra la mission et préparera une sauvegarde rechargeable dans le jeu.
              </span>
            </span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 erp-btn-secondary">Annuler</button>
            <button
              type="button"
              disabled={saving || !driverId}
              onClick={() => onAccept({
                driverId,
                truckId: truckId || undefined,
                trailerId: trailerId || undefined,
                sendToGame,
              })}
              className="flex-1 erp-btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Création…' : sendToGame ? 'Accepter et envoyer vers ETS2' : 'Accepter mission & feuille de route'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
