import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Client, MissionFormInput, TransportMission } from '../../lib/dispatchTypes';
import type { MissionPriority, MissionStatus } from '../../lib/dispatchTypes';

interface MissionFormModalProps {
  open: boolean;
  editing: TransportMission | null;
  clients: Client[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: MissionFormInput) => void;
}

const EMPTY: MissionFormInput = {
  client_name: '',
  departure_city: '',
  arrival_city: '',
  loading_date: '',
  delivery_date: '',
  cargo: '',
  weight_kg: 0,
  pallets: 0,
  temperature_required: false,
  adr_required: false,
  distance_km: 0,
  price: 0,
  priority: 'normal',
  status: 'draft',
  route_notes: '',
};

export function MissionFormModal({ open, editing, clients, saving, onClose, onSubmit }: MissionFormModalProps) {
  const [form, setForm] = useState<MissionFormInput>(EMPTY);

  useEffect(() => {
    if (editing) {
      setForm({
        client_id: editing.client_id ?? undefined,
        client_name: editing.client_name ?? '',
        departure_city: editing.departure_city,
        arrival_city: editing.arrival_city,
        loading_date: editing.loading_date ?? '',
        delivery_date: editing.delivery_date,
        cargo: editing.cargo ?? '',
        weight_kg: editing.weight_kg,
        pallets: editing.pallets,
        temperature_required: editing.temperature_required,
        temperature_min: editing.temperature_min ?? undefined,
        temperature_max: editing.temperature_max ?? undefined,
        adr_required: editing.adr_required,
        distance_km: editing.distance_km,
        price: editing.price,
        priority: editing.priority,
        status: editing.status,
        route_notes: editing.route_notes ?? '',
      });
    } else {
      setForm({ ...EMPTY, delivery_date: new Date().toISOString().slice(0, 10) });
    }
  }, [editing, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="dispatch-glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/95 backdrop-blur">
          <h2 className="font-bold text-white">{editing ? 'Modifier' : 'Créer'} une mission</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase mb-1">Client</label>
            <select className="erp-select w-full text-sm" value={form.client_id ?? ''} onChange={e => {
              const c = clients.find(cl => cl.id === e.target.value);
              setForm(p => ({ ...p, client_id: e.target.value || undefined, client_name: c?.name ?? p.client_name }));
            }}>
              <option value="">— Saisie libre —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <input className="erp-input w-full text-sm" placeholder="Nom client" value={form.client_name ?? ''} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <input className="erp-input w-full text-sm" required placeholder="Ville départ *" value={form.departure_city} onChange={e => setForm(p => ({ ...p, departure_city: e.target.value }))} />
            <input className="erp-input w-full text-sm" required placeholder="Ville arrivée *" value={form.arrival_city} onChange={e => setForm(p => ({ ...p, arrival_city: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Chargement</label>
              <input type="date" className="erp-input w-full text-sm" value={form.loading_date ?? ''} onChange={e => setForm(p => ({ ...p, loading_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Livraison *</label>
              <input type="date" required className="erp-input w-full text-sm" value={form.delivery_date} onChange={e => setForm(p => ({ ...p, delivery_date: e.target.value }))} />
            </div>
          </div>
          <input className="erp-input w-full text-sm" placeholder="Marchandise" value={form.cargo ?? ''} onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))} />
          <div className="grid grid-cols-3 gap-3">
            <input type="number" className="erp-input w-full text-sm" placeholder="Poids kg" value={form.weight_kg ?? 0} onChange={e => setForm(p => ({ ...p, weight_kg: parseFloat(e.target.value) || 0 }))} />
            <input type="number" className="erp-input w-full text-sm" placeholder="Palettes" value={form.pallets ?? 0} onChange={e => setForm(p => ({ ...p, pallets: parseInt(e.target.value) || 0 }))} />
            <input type="number" className="erp-input w-full text-sm" placeholder="Distance km" value={form.distance_km ?? 0} onChange={e => setForm(p => ({ ...p, distance_km: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" className="erp-input w-full text-sm" placeholder="Prix €" value={form.price ?? 0} onChange={e => setForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} />
            <select className="erp-select w-full text-sm" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as MissionPriority }))}>
              <option value="low">Priorité basse</option>
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-white/60">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.temperature_required} onChange={e => setForm(p => ({ ...p, temperature_required: e.target.checked }))} />
              Température contrôlée
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.adr_required} onChange={e => setForm(p => ({ ...p, adr_required: e.target.checked }))} />
              ADR requis
            </label>
          </div>
          {form.temperature_required && (
            <div className="grid grid-cols-2 gap-3">
              <input type="number" className="erp-input w-full text-sm" placeholder="Temp. min °C" value={form.temperature_min ?? ''} onChange={e => setForm(p => ({ ...p, temperature_min: parseFloat(e.target.value) || undefined }))} />
              <input type="number" className="erp-input w-full text-sm" placeholder="Temp. max °C" value={form.temperature_max ?? ''} onChange={e => setForm(p => ({ ...p, temperature_max: parseFloat(e.target.value) || undefined }))} />
            </div>
          )}
          {editing && (
            <select className="erp-select w-full text-sm" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as MissionStatus }))}>
              <option value="draft">Brouillon</option>
              <option value="planned">Planifiée</option>
              <option value="assigned">Assignée</option>
              <option value="in_progress">En cours</option>
              <option value="delivered">Livrée</option>
              <option value="cancelled">Annulée</option>
            </select>
          )}
          <textarea className="erp-input w-full text-sm min-h-[60px]" placeholder="Notes route" value={form.route_notes ?? ''} onChange={e => setForm(p => ({ ...p, route_notes: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white/5 rounded-xl text-white/50 text-sm">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
