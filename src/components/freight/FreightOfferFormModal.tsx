import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { FreightOffer, FreightOfferInput, FreightOfferPriority } from '../../lib/freightTypes';

interface FreightOfferFormModalProps {
  open: boolean;
  editing: FreightOffer | null;
  clients: { id: string; name: string }[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: FreightOfferInput) => void;
}

const EMPTY: FreightOfferInput = {
  departure_city: '',
  arrival_city: '',
  departure_country: 'France',
  arrival_country: 'France',
  cargo: '',
  weight_kg: 0,
  pallets: 0,
  temperature_required: false,
  adr_required: false,
  distance_km: 0,
  price: 0,
  delivery_date: '',
  priority: 'normal',
};

export function FreightOfferFormModal({
  open, editing, clients, saving, onClose, onSubmit,
}: FreightOfferFormModalProps) {
  const [form, setForm] = useState<FreightOfferInput>(EMPTY);

  useEffect(() => {
    if (editing) {
      setForm({
        client_id: editing.client_id,
        client_name: editing.client_name ?? undefined,
        departure_city: editing.departure_city,
        arrival_city: editing.arrival_city,
        departure_country: editing.departure_country,
        arrival_country: editing.arrival_country,
        cargo: editing.cargo ?? undefined,
        weight_kg: editing.weight_kg,
        pallets: editing.pallets,
        temperature_required: editing.temperature_required,
        temperature_min: editing.temperature_min,
        temperature_max: editing.temperature_max,
        adr_required: editing.adr_required,
        distance_km: editing.distance_km,
        price: editing.price,
        deadline_at: editing.deadline_at,
        loading_date: editing.loading_date,
        delivery_date: editing.delivery_date,
        priority: editing.priority,
        expires_at: editing.expires_at,
        notes: editing.notes ?? undefined,
      });
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      setForm({
        ...EMPTY,
        delivery_date: d.toISOString().slice(0, 10),
        expires_at: new Date(Date.now() + 48 * 3600000).toISOString(),
      });
    }
  }, [editing, open]);

  if (!open) return null;

  const pricePerKm = form.distance_km > 0 ? (form.price / form.distance_km).toFixed(2) : '—';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="freight-glass rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/95 backdrop-blur z-10">
          <h2 className="font-bold text-white">{editing ? 'Modifier' : 'Créer'} une offre fret</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Client">
              <select
                className="erp-select w-full"
                value={form.client_id ?? ''}
                onChange={e => {
                  const c = clients.find(cl => cl.id === e.target.value);
                  setForm(p => ({ ...p, client_id: e.target.value || null, client_name: c?.name }));
                }}
              >
                <option value="">— Client libre —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Nom client (si libre)">
              <input className="erp-input w-full" value={form.client_name ?? ''} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ville départ *">
              <input required className="erp-input w-full" value={form.departure_city} onChange={e => setForm(p => ({ ...p, departure_city: e.target.value }))} />
            </Field>
            <Field label="Ville arrivée *">
              <input required className="erp-input w-full" value={form.arrival_city} onChange={e => setForm(p => ({ ...p, arrival_city: e.target.value }))} />
            </Field>
            <Field label="Pays départ">
              <input className="erp-input w-full" value={form.departure_country ?? 'France'} onChange={e => setForm(p => ({ ...p, departure_country: e.target.value }))} />
            </Field>
            <Field label="Pays arrivée">
              <input className="erp-input w-full" value={form.arrival_country ?? 'France'} onChange={e => setForm(p => ({ ...p, arrival_country: e.target.value }))} />
            </Field>
          </div>

          <Field label="Cargo">
            <input className="erp-input w-full" value={form.cargo ?? ''} onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))} />
          </Field>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Poids (kg)">
              <input type="number" className="erp-input w-full" value={form.weight_kg ?? 0} onChange={e => setForm(p => ({ ...p, weight_kg: Number(e.target.value) }))} />
            </Field>
            <Field label="Palettes">
              <input type="number" className="erp-input w-full" value={form.pallets ?? 0} onChange={e => setForm(p => ({ ...p, pallets: Number(e.target.value) }))} />
            </Field>
            <Field label="Distance (km) *">
              <input required type="number" className="erp-input w-full" value={form.distance_km} onChange={e => setForm(p => ({ ...p, distance_km: Number(e.target.value) }))} />
            </Field>
            <Field label="Prix (€) *">
              <input required type="number" className="erp-input w-full" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} />
            </Field>
          </div>

          <p className="text-xs text-emerald-400/80 font-semibold">Prix / km estimé : {pricePerKm} €</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="Chargement">
              <input type="date" className="erp-input w-full" value={form.loading_date ?? ''} onChange={e => setForm(p => ({ ...p, loading_date: e.target.value || null }))} />
            </Field>
            <Field label="Livraison *">
              <input required type="date" className="erp-input w-full" value={form.delivery_date} onChange={e => setForm(p => ({ ...p, delivery_date: e.target.value }))} />
            </Field>
            <Field label="Expiration offre">
              <input type="datetime-local" className="erp-input w-full" value={form.expires_at ? form.expires_at.slice(0, 16) : ''} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null }))} />
            </Field>
          </div>

          <Field label="Priorité">
            <select className="erp-select w-full" value={form.priority ?? 'normal'} onChange={e => setForm(p => ({ ...p, priority: e.target.value as FreightOfferPriority }))}>
              <option value="low">Basse</option>
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
              <option value="urgent">Urgente</option>
            </select>
          </Field>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
              <input type="checkbox" checked={form.temperature_required} onChange={e => setForm(p => ({ ...p, temperature_required: e.target.checked }))} />
              Frigo requis
            </label>
            <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
              <input type="checkbox" checked={form.adr_required} onChange={e => setForm(p => ({ ...p, adr_required: e.target.checked }))} />
              ADR requis
            </label>
          </div>

          {form.temperature_required && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Temp. min (°C)">
                <input type="number" className="erp-input w-full" value={form.temperature_min ?? ''} onChange={e => setForm(p => ({ ...p, temperature_min: e.target.value ? Number(e.target.value) : null }))} />
              </Field>
              <Field label="Temp. max (°C)">
                <input type="number" className="erp-input w-full" value={form.temperature_max ?? ''} onChange={e => setForm(p => ({ ...p, temperature_max: e.target.value ? Number(e.target.value) : null }))} />
              </Field>
            </div>
          )}

          <Field label="Notes">
            <textarea className="erp-input w-full min-h-[72px]" value={form.notes ?? ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </Field>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 erp-btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 erp-btn-primary">
              {saving ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Publier l\'offre'}
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
      <label className="block text-xs font-semibold text-white/40 uppercase mb-1">{label}</label>
      {children}
    </div>
  );
}
