import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { DriverFormInput } from '../../services/driverService';
import type { DriverProfile } from '../../lib/driverTypes';
import { MEMBER_ROLE_LABELS } from '../../lib/driverTypes';

const EMPTY_FORM: DriverFormInput = {
  name: '',
  pseudo: '',
  phone: '',
  email: '',
  license_number: '',
  photo_url: '',
  banner_url: '',
  status: 'active',
  driving_status: 'resting',
  presence_status: 'offline',
  member_role: 'chauffeur',
  address: '',
  city: '',
  postal_code: '',
  country: '',
  date_of_birth: '',
  discord_name: '',
  truckersmp_id: '',
  steam_id: '',
  employee_number: '',
  hiring_date: '',
  license_expires_at: '',
  eco_driving_score: 0,
  emergency_contact_name: '',
  emergency_contact_phone: '',
  employment_contract: 'CDI',
  salary_mode: 'percentage',
  salary_base: 0,
  driver_level: 1,
  experience_years: 0,
  license_categories: 'C,CE',
  has_adr: false,
  dangerous_goods_authorized: false,
  profile_description: '',
  driving_hours_month: 0,
  rest_hours_month: 0,
};

interface DriverFormModalProps {
  open: boolean;
  editing: DriverProfile | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: DriverFormInput) => void;
}

export function DriverFormModal({ open, editing, saving, onClose, onSubmit }: DriverFormModalProps) {
  const [form, setForm] = useState<DriverFormInput>(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        pseudo: editing.pseudo ?? '',
        phone: editing.phone ?? '',
        email: editing.email ?? '',
        license_number: editing.license_number ?? '',
        photo_url: editing.photo_url ?? '',
        banner_url: editing.banner_url ?? '',
        status: editing.status,
        driving_status: editing.driving_status,
        presence_status: editing.presence_status ?? 'offline',
        member_role: editing.member_role ?? 'chauffeur',
        address: editing.address ?? '',
        city: editing.city ?? '',
        postal_code: editing.postal_code ?? '',
        country: editing.country ?? '',
        date_of_birth: editing.date_of_birth ?? '',
        discord_name: editing.discord_name ?? '',
        truckersmp_id: editing.truckersmp_id ?? '',
        steam_id: editing.steam_id ?? '',
        employee_number: editing.employee_number ?? '',
        hiring_date: editing.hiring_date ?? '',
        license_expires_at: editing.license_expires_at ?? '',
        eco_driving_score: editing.eco_driving_score,
        emergency_contact_name: editing.emergency_contact_name ?? '',
        emergency_contact_phone: editing.emergency_contact_phone ?? '',
        employment_contract: editing.employment_contract ?? 'CDI',
        salary_mode: editing.salary_mode,
        salary_base: editing.salary_base,
        driver_level: editing.driver_level,
        experience_years: editing.experience_years,
        license_categories: editing.license_categories ?? 'C,CE',
        has_adr: editing.has_adr,
        dangerous_goods_authorized: editing.dangerous_goods_authorized,
        profile_description: editing.profile_description ?? '',
        driving_hours_month: editing.driving_hours_month,
        rest_hours_month: editing.rest_hours_month,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, editing]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="driver-glass rounded-2xl w-full max-w-2xl my-4 border border-white/10">
        <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/95 backdrop-blur z-10 rounded-t-2xl">
          <h2 className="font-bold text-white">{editing ? 'Modifier' : 'Ajouter'} un chauffeur</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
        <form
          onSubmit={e => { e.preventDefault(); onSubmit(form); }}
          className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto"
        >
          <SectionTitle className="sm:col-span-2">Identité</SectionTitle>
          <Field label="Nom complet *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} required className="sm:col-span-2" />
          <Field label="Pseudo" value={form.pseudo ?? ''} onChange={v => setForm(p => ({ ...p, pseudo: v }))} />
          <Field label="N° employé" value={form.employee_number ?? ''} onChange={v => setForm(p => ({ ...p, employee_number: v }))} />
          <Field label="Photo URL" value={form.photo_url ?? ''} onChange={v => setForm(p => ({ ...p, photo_url: v }))} />
          <Field label="Bannière URL" value={form.banner_url ?? ''} onChange={v => setForm(p => ({ ...p, banner_url: v }))} />

          <SectionTitle className="sm:col-span-2">Informations personnelles</SectionTitle>
          <Field label="Date de naissance" type="date" value={form.date_of_birth ?? ''} onChange={v => setForm(p => ({ ...p, date_of_birth: v }))} />
          <Field label="Pays" value={form.country ?? ''} onChange={v => setForm(p => ({ ...p, country: v }))} />
          <Field label="Ville" value={form.city ?? ''} onChange={v => setForm(p => ({ ...p, city: v }))} />
          <Field label="Code postal" value={form.postal_code ?? ''} onChange={v => setForm(p => ({ ...p, postal_code: v }))} />
          <Field label="Adresse" value={form.address ?? ''} onChange={v => setForm(p => ({ ...p, address: v }))} className="sm:col-span-2" />
          <Field label="Téléphone" value={form.phone ?? ''} onChange={v => setForm(p => ({ ...p, phone: v }))} />
          <Field label="E-mail" value={form.email ?? ''} onChange={v => setForm(p => ({ ...p, email: v }))} />
          <Field label="Discord" value={form.discord_name ?? ''} onChange={v => setForm(p => ({ ...p, discord_name: v }))} />
          <Field label="TruckersMP ID" value={form.truckersmp_id ?? ''} onChange={v => setForm(p => ({ ...p, truckersmp_id: v }))} />
          <Field label="Steam ID" value={form.steam_id ?? ''} onChange={v => setForm(p => ({ ...p, steam_id: v }))} />

          <SectionTitle className="sm:col-span-2">Informations professionnelles</SectionTitle>
          <Field label="Date d'embauche" type="date" value={form.hiring_date ?? ''} onChange={v => setForm(p => ({ ...p, hiring_date: v }))} />
          <Select label="Contrat" value={form.employment_contract ?? 'CDI'} onChange={v => setForm(p => ({ ...p, employment_contract: v }))} options={[
            { value: 'CDI', label: 'CDI' },
            { value: 'CDD', label: 'CDD' },
            { value: 'Freelancer', label: 'Freelance' },
          ]} />
          <Field label="N° permis" value={form.license_number ?? ''} onChange={v => setForm(p => ({ ...p, license_number: v }))} />
          <Field label="Catégories permis" value={form.license_categories ?? ''} onChange={v => setForm(p => ({ ...p, license_categories: v }))} />
          <Field label="Expiration permis" type="date" value={form.license_expires_at ?? ''} onChange={v => setForm(p => ({ ...p, license_expires_at: v }))} />
          <Field label="Score éco-conduite" type="number" value={String(form.eco_driving_score ?? 0)} onChange={v => setForm(p => ({ ...p, eco_driving_score: Number(v) }))} />
          <Field label="Niveau expérience" type="number" value={String(form.driver_level ?? 1)} onChange={v => setForm(p => ({ ...p, driver_level: Number(v) }))} />
          <Field label="Années d'expérience" type="number" value={String(form.experience_years ?? 0)} onChange={v => setForm(p => ({ ...p, experience_years: Number(v) }))} />
          <Select label="Mode salaire" value={form.salary_mode} onChange={v => setForm(p => ({ ...p, salary_mode: v as DriverFormInput['salary_mode'] }))} options={[
            { value: 'percentage', label: 'Pourcentage' },
            { value: 'fixed', label: 'Fixe' },
            { value: 'per_km', label: 'Par km' },
          ]} />

          <SectionTitle className="sm:col-span-2">Statuts</SectionTitle>
          <Select label="Rôle membre" value={form.member_role ?? 'chauffeur'} onChange={v => setForm(p => ({ ...p, member_role: v }))} options={
            Object.entries(MEMBER_ROLE_LABELS).map(([value, label]) => ({ value, label }))
          } />
          <Select label="Présence" value={form.presence_status ?? 'offline'} onChange={v => setForm(p => ({ ...p, presence_status: v as DriverFormInput['presence_status'] }))} options={[
            { value: 'online', label: 'En ligne' },
            { value: 'offline', label: 'Hors ligne' },
            { value: 'driving', label: 'Conduite' },
            { value: 'rest', label: 'Repos' },
            { value: 'vacation', label: 'Vacances' },
          ]} />
          <Select label="Statut emploi" value={form.status} onChange={v => setForm(p => ({ ...p, status: v as DriverProfile['status'] }))} options={[
            { value: 'active', label: 'Actif' },
            { value: 'inactive', label: 'Inactif' },
            { value: 'on_leave', label: 'En congé' },
          ]} />
          <Select label="Statut conduite" value={form.driving_status} onChange={v => setForm(p => ({ ...p, driving_status: v as DriverProfile['driving_status'] }))} options={[
            { value: 'driving', label: 'En route' },
            { value: 'resting', label: 'Au repos' },
            { value: 'vacation', label: 'Vacances' },
            { value: 'sick', label: 'Arrêt maladie' },
          ]} />

          <Field label="Contact urgence" value={form.emergency_contact_name ?? ''} onChange={v => setForm(p => ({ ...p, emergency_contact_name: v }))} />
          <Field label="Tél. urgence" value={form.emergency_contact_phone ?? ''} onChange={v => setForm(p => ({ ...p, emergency_contact_phone: v }))} />

          <label className="flex items-center gap-2 text-sm text-white/60 sm:col-span-2">
            <input type="checkbox" checked={form.has_adr} onChange={e => setForm(p => ({ ...p, has_adr: e.target.checked }))} />
            Certificat ADR
          </label>
          <label className="flex items-center gap-2 text-sm text-white/60 sm:col-span-2">
            <input type="checkbox" checked={form.dangerous_goods_authorized} onChange={e => setForm(p => ({ ...p, dangerous_goods_authorized: e.target.checked }))} />
            Marchandises dangereuses autorisées
          </label>

          <div className="sm:col-span-2 flex gap-3 pt-2 sticky bottom-0 bg-[#0a0a0a]/95 backdrop-blur pb-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white/5 rounded-xl text-white/50 text-sm">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionTitle({ children, className = '' }: { children: string; className?: string }) {
  return (
    <p className={`text-xs font-bold text-red-400 uppercase tracking-widest pt-2 ${className}`}>{children}</p>
  );
}

function Field({ label, value, onChange, required, type = 'text', className = '' }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} className="erp-input w-full" />
    </div>
  );
}

function Select({ label, value, onChange, options, className = '' }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="erp-select w-full">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export { EMPTY_FORM as EMPTY_DRIVER_FORM };
