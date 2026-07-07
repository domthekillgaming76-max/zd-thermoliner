import { Shield, CreditCard, Bell, Building2 } from 'lucide-react';
import type { BankSettings } from '../../../lib/bankSettings';
import { BankGlassPanel } from './BankGlassPanel';

interface BankSettingsPanelProps {
  settings: BankSettings;
  iban: string;
  onChange: (settings: BankSettings) => void;
  onSave: () => void;
  saving?: boolean;
}

export function BankSettingsPanel({ settings, iban, onChange, onSave, saving }: BankSettingsPanelProps) {
  function set<K extends keyof BankSettings>(key: K, value: BankSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <BankGlassPanel className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-4 h-4 bank-lounge-accent-icon" />
          <h3 className="text-sm font-bold text-white">Compte & IBAN</h3>
        </div>
        <Field label="IBAN affiché" value={settings.ibanDisplay || iban} onChange={v => set('ibanDisplay', v)} />
        <div>
          <label className="block text-xs text-white/40 uppercase mb-1.5">Logo banque</label>
          <select value={settings.bankLogo} onChange={e => set('bankLogo', e.target.value as BankSettings['bankLogo'])} className="erp-select w-full">
            <option value="zd">Z&D Thermoliner</option>
            <option value="teal">Thème teal</option>
            <option value="green">Thème vert</option>
          </select>
        </div>
      </BankGlassPanel>

      <BankGlassPanel className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="w-4 h-4 bank-lounge-accent-icon" />
          <h3 className="text-sm font-bold text-white">Cartes & plafonds</h3>
        </div>
        <Field label="Plafond journalier (€)" type="number" value={String(settings.dailyPaymentLimit)} onChange={v => set('dailyPaymentLimit', Number(v) || 0)} />
        <Field label="Plafond mensuel (€)" type="number" value={String(settings.monthlyPaymentLimit)} onChange={v => set('monthlyPaymentLimit', Number(v) || 0)} />
        <Toggle label="Cartes actives" checked={settings.cardsEnabled} onChange={v => set('cardsEnabled', v)} />
      </BankGlassPanel>

      <BankGlassPanel className="p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 bank-lounge-accent-icon" />
          <h3 className="text-sm font-bold text-white">Notifications</h3>
        </div>
        <Toggle label="Encaissements" checked={settings.notifyIncoming} onChange={v => set('notifyIncoming', v)} />
        <Toggle label="Décaissements" checked={settings.notifyOutgoing} onChange={v => set('notifyOutgoing', v)} />
        <Toggle label="Feuilles validées" checked={settings.notifyRoadSheet} onChange={v => set('notifyRoadSheet', v)} />
        <Toggle label="Salaires" checked={settings.notifySalary} onChange={v => set('notifySalary', v)} />
        <Toggle label="Crédits flotte" checked={settings.notifyLoan} onChange={v => set('notifyLoan', v)} />
      </BankGlassPanel>

      <BankGlassPanel className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 bank-lounge-accent-icon" />
          <h3 className="text-sm font-bold text-white">Sécurité</h3>
        </div>
        <Toggle label="Double authentification" checked={settings.twoFactorEnabled} onChange={v => set('twoFactorEnabled', v)} />
        <button type="button" onClick={onSave} disabled={saving} className="bank-lounge-btn-primary w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50">
          {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
        </button>
      </BankGlassPanel>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-white/40 uppercase mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="erp-input w-full" />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1 cursor-pointer">
      <span className="text-sm text-white/70">{label}</span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4 accent-teal-500" />
    </label>
  );
}
