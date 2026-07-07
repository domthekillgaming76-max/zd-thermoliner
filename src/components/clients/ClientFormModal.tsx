import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { ClientFormInput, ErpClient } from '../../lib/clientTypes';

const EMPTY: ClientFormInput = {
  name: '', contact_name: '', contact_email: '', contact_phone: '',
  email: '', phone: '', address: '', city: '', postal_code: '', country: 'France',
  vat_number: '', siret: '', payment_terms: 30, preferred_routes: '', preferred_cargo: '',
  notes: '', status: 'active',
};

interface ClientFormModalProps {
  open: boolean;
  editing: ErpClient | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: ClientFormInput) => void;
}

export function ClientFormModal({ open, editing, saving, onClose, onSubmit }: ClientFormModalProps) {
  const [form, setForm] = useState<ClientFormInput>(EMPTY);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        contact_name: editing.contact_name ?? '',
        contact_email: editing.contact_email ?? '',
        contact_phone: editing.contact_phone ?? '',
        email: editing.email ?? '',
        phone: editing.phone ?? '',
        address: editing.address ?? '',
        city: editing.city ?? '',
        postal_code: editing.postal_code ?? '',
        country: editing.country ?? 'France',
        vat_number: editing.vat_number ?? '',
        siret: editing.siret ?? '',
        payment_terms: editing.payment_terms,
        preferred_routes: editing.preferred_routes ?? '',
        preferred_cargo: editing.preferred_cargo ?? '',
        notes: editing.notes ?? '',
        status: editing.status,
      });
    } else {
      setForm(EMPTY);
    }
  }, [editing, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="client-glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-white/5 flex justify-between sticky top-0 bg-[#0a0a0a]/95 backdrop-blur">
          <h2 className="font-bold text-white">{editing ? 'Modifier' : 'Nouveau'} client</h2>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-white/40" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="p-5 space-y-3">
          <Field label="Raison sociale *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact" value={form.contact_name ?? ''} onChange={v => setForm(p => ({ ...p, contact_name: v }))} />
            <Field label="Email" value={form.email ?? ''} onChange={v => setForm(p => ({ ...p, email: v, contact_email: v }))} />
            <Field label="Téléphone" value={form.phone ?? ''} onChange={v => setForm(p => ({ ...p, phone: v, contact_phone: v }))} />
            <Field label="Délai paiement (j)" type="number" value={String(form.payment_terms ?? 30)} onChange={v => setForm(p => ({ ...p, payment_terms: parseInt(v) || 30 }))} />
          </div>
          <Field label="Adresse" value={form.address ?? ''} onChange={v => setForm(p => ({ ...p, address: v }))} />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Ville" value={form.city ?? ''} onChange={v => setForm(p => ({ ...p, city: v }))} />
            <Field label="CP" value={form.postal_code ?? ''} onChange={v => setForm(p => ({ ...p, postal_code: v }))} />
            <Field label="Pays" value={form.country ?? ''} onChange={v => setForm(p => ({ ...p, country: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="N° TVA" value={form.vat_number ?? ''} onChange={v => setForm(p => ({ ...p, vat_number: v }))} />
            <Field label="SIRET" value={form.siret ?? ''} onChange={v => setForm(p => ({ ...p, siret: v }))} />
          </div>
          <Field label="Routes préférées" value={form.preferred_routes ?? ''} onChange={v => setForm(p => ({ ...p, preferred_routes: v }))} />
          <Field label="Fret préféré" value={form.preferred_cargo ?? ''} onChange={v => setForm(p => ({ ...p, preferred_cargo: v }))} />
          <select className="erp-select w-full text-sm" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as ClientFormInput['status'] }))}>
            <option value="active">Actif</option>
            <option value="prospect">Prospect</option>
            <option value="inactive">Inactif</option>
            <option value="suspended">Suspendu</option>
          </select>
          <textarea className="erp-input w-full text-sm min-h-[60px]" placeholder="Notes" value={form.notes ?? ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white/5 rounded-xl text-white/50 text-sm">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/40 uppercase mb-1">{label}</label>
      <input type={type} required={required} className="erp-input w-full text-sm" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
