import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Calculator, Download, Save, RefreshCw } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';
import { useAuth } from '../contexts/AuthContext';
import {
  downloadAccountingCsv,
  useFinanceSettings,
  useUpdateFinanceSettings,
} from '../hooks/useFinance';
import { canAccessFinanceModule, canEditFinanceSettings, canExportAccounting } from '../lib/financePermissions';

export function AccountingPage() {
  const { profile, user } = useAuth();
  const canAccess = canAccessFinanceModule(profile?.role, user?.email);
  const canEdit = canEditFinanceSettings(profile?.role, user?.email);
  const canExport = canExportAccounting(profile?.role, user?.email);
  const { data: settings } = useFinanceSettings();
  const updateSettings = useUpdateFinanceSettings();
  const [vatRate, setVatRate] = useState('20');
  const [deliveryBonus, setDeliveryBonus] = useState('25');
  const [kmRate, setKmRate] = useState('0.35');
  const [autoInvoice, setAutoInvoice] = useState(true);
  const [autoTelemetryValidation, setAutoTelemetryValidation] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setVatRate(String(settings.vat_rate));
    setDeliveryBonus(String(settings.delivery_bonus_eur));
    setKmRate(String(settings.default_salary_per_km));
    setAutoInvoice(settings.auto_invoice_on_validation);
    setAutoTelemetryValidation(settings.validation_automatique_livraisons !== false);
  }, [settings]);

  if (!canAccess) {
    return <Navigate to="/dashboard" replace state={{ accessDenied: 'Accès réservé à la comptabilité.' }} />;
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !canEdit) return;
    setPageError(null);
    try {
      await updateSettings.mutateAsync({
        userId: user.id,
        input: {
          vat_rate: Number(vatRate),
          delivery_bonus_eur: Number(deliveryBonus),
          default_salary_per_km: Number(kmRate),
          auto_invoice_on_validation: autoInvoice,
          validation_automatique_livraisons: autoTelemetryValidation,
        },
      });
      setSuccess('Paramètres finance enregistrés.');
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Erreur enregistrement.');
    }
  }

  async function handleExport() {
    if (!canExport) return;
    setExporting(true);
    try {
      await downloadAccountingCsv();
      setSuccess('Export comptable téléchargé.');
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Erreur export.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <PageHeader title="Comptabilité" subtitle="Paramètres finance et export des écritures" icon={Calculator} />

        {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}
        {success && <FormSuccess message={success} onDismiss={() => setSuccess(null)} />}

        {canEdit && (
          <form onSubmit={handleSaveSettings} className="erp-card rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white">Paramètres finance</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs text-white/40">TVA (%)</span>
                <input className="erp-input w-full" type="number" step="0.1" value={vatRate}
                  onChange={e => setVatRate(e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-white/40">Bonus livraison (€)</span>
                <input className="erp-input w-full" type="number" step="0.01" value={deliveryBonus}
                  onChange={e => setDeliveryBonus(e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-white/40">Salaire / km par défaut (€)</span>
                <input className="erp-input w-full" type="number" step="0.01" value={kmRate}
                  onChange={e => setKmRate(e.target.value)} />
              </label>
              <label className="flex items-center gap-3 pt-6">
                <input type="checkbox" checked={autoInvoice} onChange={e => setAutoInvoice(e.target.checked)} />
                <span className="text-sm text-white/70">Facturation auto à la validation feuille de route</span>
              </label>
              <label className="flex items-center gap-3 pt-6 sm:col-span-2">
                <input type="checkbox" checked={autoTelemetryValidation} onChange={e => setAutoTelemetryValidation(e.target.checked)} />
                <span className="text-sm text-white/70">Validation automatique des livraisons télémétrie (ETS2/ATS)</span>
              </label>
            </div>
            <button type="submit" disabled={updateSettings.isPending}
              className="btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
              <Save className="w-4 h-4" />
              Enregistrer
            </button>
          </form>
        )}

        <div className="erp-card rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">Export comptable</h2>
          <p className="text-sm text-white/50">
            Téléchargez les écritures bancaires (revenus, dépenses, salaires, carburant, péages) au format CSV.
          </p>
          {canExport ? (
            <button type="button" onClick={handleExport} disabled={exporting}
              className="btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
              {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Exporter CSV
            </button>
          ) : (
            <p className="text-xs text-white/35">Réservé aux administrateurs.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
