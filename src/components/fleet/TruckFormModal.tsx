import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { FleetTruck } from '../../lib/fleetTypes';
import type { TruckFormInput } from '../../services/fleetService';
import type { Garage } from '../../lib/supabase';
import type { Trailer } from '../../lib/driverTypes';

interface TruckFormModalProps {
  open: boolean;
  editing: FleetTruck | null;
  saving: boolean;
  garages: Garage[];
  trailers: Trailer[];
  onClose: () => void;
  onSubmit: (input: TruckFormInput) => void;
}

const EMPTY: TruckFormInput = {
  registration: '',
  brand: '',
  model: '',
  vin: '',
  year: undefined,
  mileage: 0,
  fuel_consumption: 0,
  status: 'active',
  garage_id: '',
  trailer_id: '',
  photo_url: '',
  insurance_date: '',
  technical_inspection_date: '',
};

export function TruckFormModal({ open, editing, saving, garages, trailers, onClose, onSubmit }: TruckFormModalProps) {
  const [form, setForm] = useState<TruckFormInput>(EMPTY);

  useEffect(() => {
    if (editing) {
      setForm({
        registration: editing.registration,
        brand: editing.brand ?? '',
        model: editing.model ?? '',
        vin: editing.vin ?? '',
        year: editing.year ?? undefined,
        mileage: editing.mileage,
        fuel_consumption: editing.fuel_consumption,
        status: editing.status,
        garage_id: editing.garage_id ?? '',
        trailer_id: editing.trailer_id ?? '',
        photo_url: editing.photo_url ?? '',
        insurance_date: editing.insurance_date ?? '',
        technical_inspection_date: editing.technical_inspection_date ?? '',
      });
    } else {
      setForm(EMPTY);
    }
  }, [editing, open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="fleet-glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/95 backdrop-blur">
          <h2 className="font-bold text-white">{editing ? 'Modifier' : 'Ajouter'} un camion</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {[
            { label: 'Immatriculation *', key: 'registration' as const, required: true },
            { label: 'Marque', key: 'brand' as const },
            { label: 'Modèle', key: 'model' as const },
            { label: 'VIN', key: 'vin' as const },
            { label: 'Photo URL', key: 'photo_url' as const },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-white/40 uppercase mb-1">{f.label}</label>
              <input
                className="erp-input w-full text-sm"
                required={f.required}
                value={(form[f.key] as string) ?? ''}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase mb-1">Année</label>
              <input type="number" className="erp-input w-full text-sm" value={form.year ?? ''} onChange={e => setForm(p => ({ ...p, year: parseInt(e.target.value) || undefined }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase mb-1">Km</label>
              <input type="number" min={0} className="erp-input w-full text-sm" value={form.mileage ?? 0} onChange={e => setForm(p => ({ ...p, mileage: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase mb-1">L/100km</label>
              <input type="number" step="0.1" className="erp-input w-full text-sm" value={form.fuel_consumption ?? 0} onChange={e => setForm(p => ({ ...p, fuel_consumption: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase mb-1">Statut</label>
              <select className="erp-select w-full text-sm" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as TruckFormInput['status'] }))}>
                <option value="active">En service</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retiré</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase mb-1">Assurance</label>
              <input type="date" className="erp-input w-full text-sm" value={form.insurance_date ?? ''} onChange={e => setForm(p => ({ ...p, insurance_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase mb-1">Contrôle technique</label>
              <input type="date" className="erp-input w-full text-sm" value={form.technical_inspection_date ?? ''} onChange={e => setForm(p => ({ ...p, technical_inspection_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase mb-1">Garage</label>
            <select className="erp-select w-full text-sm" value={form.garage_id ?? ''} onChange={e => setForm(p => ({ ...p, garage_id: e.target.value }))}>
              <option value="">— Aucun —</option>
              {garages.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase mb-1">Remorque</label>
            <select className="erp-select w-full text-sm" value={form.trailer_id ?? ''} onChange={e => setForm(p => ({ ...p, trailer_id: e.target.value }))}>
              <option value="">— Aucune —</option>
              {trailers.map(t => <option key={t.id} value={t.id}>{t.registration} — {t.type}</option>)}
            </select>
          </div>
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
