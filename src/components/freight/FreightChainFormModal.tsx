import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link2, Plus, Trash2, X } from 'lucide-react';
import type { FreightChainInput, FreightChainLegInput, FreightOfferPriority } from '../../lib/freightTypes';
import { computeChainTotals, formatFreightCurrency } from '../../lib/freightTypes';

interface FreightChainFormModalProps {
  open: boolean;
  clients: { id: string; name: string }[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: FreightChainInput) => void;
}

const EMPTY_LEG: FreightChainLegInput = {
  departure_city: '',
  arrival_city: '',
  cargo: '',
  distance_km: 0,
  price: 0,
  delivery_date: '',
};

export function FreightChainFormModal({ open, clients, saving, onClose, onSubmit }: FreightChainFormModalProps) {
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [priority, setPriority] = useState<FreightOfferPriority>('normal');
  const [legs, setLegs] = useState<FreightChainLegInput[]>([
    { ...EMPTY_LEG },
    { ...EMPTY_LEG },
  ]);

  useEffect(() => {
    if (!open) return;
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const dateStr = d.toISOString().slice(0, 10);
    setTitle('');
    setClientId('');
    setClientName('');
    setPriority('normal');
    setLegs([
      { ...EMPTY_LEG, delivery_date: dateStr },
      { ...EMPTY_LEG, delivery_date: dateStr },
    ]);
  }, [open]);

  function updateLeg(index: number, patch: Partial<FreightChainLegInput>) {
    setLegs(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      if (patch.arrival_city && index + 1 < next.length) {
        next[index + 1] = { ...next[index + 1], departure_city: patch.arrival_city };
      }
      return next;
    });
  }

  function addLeg() {
    const last = legs[legs.length - 1];
    const d = last?.delivery_date || new Date().toISOString().slice(0, 10);
    setLegs(prev => [...prev, {
      ...EMPTY_LEG,
      departure_city: last?.arrival_city ?? '',
      delivery_date: d,
    }]);
  }

  function removeLeg(index: number) {
    if (legs.length <= 2) return;
    setLegs(prev => {
      const next = prev.filter((_, i) => i !== index);
      for (let i = 1; i < next.length; i++) {
        next[i] = { ...next[i], departure_city: next[i - 1].arrival_city };
      }
      return next;
    });
  }

  const totals = computeChainTotals(legs.map(l => ({ distance_km: Number(l.distance_km) || 0, price: Number(l.price) || 0 })));

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="freight-glass rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/95 backdrop-blur z-10">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-white">Créer une route chaînée</h2>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            onSubmit({
              title,
              client_id: clientId || null,
              client_name: clientName || undefined,
              legs: legs.map((l, i) => ({
                ...l,
                departure_city: i > 0 ? legs[i - 1].arrival_city : l.departure_city,
                distance_km: Number(l.distance_km),
                price: Number(l.price),
              })),
              priority,
            });
          }}
          className="p-5 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Titre du tour *">
              <input required className="erp-input w-full" value={title} onChange={e => setTitle(e.target.value)} placeholder="Tour Nord-Italie" />
            </Field>
            <Field label="Priorité">
              <select className="erp-select w-full" value={priority} onChange={e => setPriority(e.target.value as FreightOfferPriority)}>
                <option value="low">Basse</option>
                <option value="normal">Normale</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Client">
              <select className="erp-select w-full" value={clientId} onChange={e => {
                const c = clients.find(cl => cl.id === e.target.value);
                setClientId(e.target.value);
                setClientName(c?.name ?? '');
              }}>
                <option value="">— Libre —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Nom client">
              <input className="erp-input w-full" value={clientName} onChange={e => setClientName(e.target.value)} />
            </Field>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold text-white/40 uppercase">Étapes de livraison</p>
            {legs.map((leg, i) => (
              <div key={i} className="freight-chain-leg-editor rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-red-400">Étape {i + 1}</span>
                  {legs.length > 2 && (
                    <button type="button" onClick={() => removeLeg(i)} className="text-white/30 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Field label={i === 0 ? 'Départ *' : 'Départ (auto)'}>
                    <input
                      required={i === 0}
                      readOnly={i > 0}
                      className={`erp-input w-full text-sm ${i > 0 ? 'opacity-60' : ''}`}
                      value={i > 0 ? legs[i - 1].arrival_city : leg.departure_city}
                      onChange={e => updateLeg(i, { departure_city: e.target.value })}
                    />
                  </Field>
                  <Field label="Arrivée *">
                    <input required className="erp-input w-full text-sm" value={leg.arrival_city} onChange={e => updateLeg(i, { arrival_city: e.target.value })} />
                  </Field>
                  <Field label="Distance km *">
                    <input required type="number" className="erp-input w-full text-sm" value={leg.distance_km || ''} onChange={e => updateLeg(i, { distance_km: Number(e.target.value) })} />
                  </Field>
                  <Field label="Prix € *">
                    <input required type="number" className="erp-input w-full text-sm" value={leg.price || ''} onChange={e => updateLeg(i, { price: Number(e.target.value) })} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Cargo">
                    <input className="erp-input w-full text-sm" value={leg.cargo ?? ''} onChange={e => updateLeg(i, { cargo: e.target.value })} />
                  </Field>
                  <Field label="Livraison">
                    <input type="date" required className="erp-input w-full text-sm" value={leg.delivery_date} onChange={e => updateLeg(i, { delivery_date: e.target.value })} />
                  </Field>
                </div>
              </div>
            ))}
            <button type="button" onClick={addLeg} className="erp-btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />Ajouter une étape
            </button>
          </div>

          <div className="freight-profit-bar rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
            <span className="text-white/40">Total {totals.total_distance_km} km</span>
            <span className="text-red-400 font-bold">{formatFreightCurrency(totals.total_revenue)}</span>
            <span className="text-white/40">Dépenses {formatFreightCurrency(totals.total_fuel_cost + totals.total_toll_estimate + totals.total_salary_estimate)}</span>
            <span className="text-emerald-400 font-bold">Profit {formatFreightCurrency(totals.total_net_profit)}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 erp-btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 erp-btn-primary">
              {saving ? 'Création…' : 'Publier le tour chaîné'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-white/40 uppercase mb-1">{label}</label>
      {children}
    </div>
  );
}
