import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  FileBarChart, Download, AlertTriangle, TrendingUp, Users, Truck,
  Route, Receipt, BarChart3,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert } from '../components/erp/FormAlert';
import { ReportsFinanceChart } from '../components/reports/ReportsFinanceChart';
import { ReportsDataTable } from '../components/reports/ReportsDataTable';
import { useAuth } from '../contexts/AuthContext';
import { useReports } from '../hooks/useReports';
import { canAccessReports, canExportReports } from '../lib/reportsPermissions';
import {
  REPORT_TAB_LABELS,
  formatReportCurrency,
  type ReportTabId,
  type ReportExportType,
} from '../lib/reportsTypes';
import { downloadCsv, logReportExport, rowsToCsv } from '../services/reportsService';

export function ReportsPage() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<ReportTabId>('overview');
  const [exportError, setExportError] = useState<string | null>(null);
  const { data, isLoading, isError, error } = useReports();

  if (!canAccessReports(profile?.role, user?.email)) {
    return <Navigate to="/dashboard" replace state={{ accessDenied: 'Accès réservé aux managers et administrateurs.' }} />;
  }

  const d = data?.dashboard;

  async function handleExport(type: ReportExportType) {
    if (!canExportReports(profile?.role, user?.email) || !data || !user) return;
    setExportError(null);
    try {
      let headers: string[] = [];
      let rows: (string | number)[][] = [];
      const date = new Date().toISOString().slice(0, 10);

      switch (type) {
        case 'finance':
          headers = ['Mois', 'Revenus', 'Dépenses', 'Bénéfice'];
          rows = data.monthlyFinance.map(m => [m.label, m.income, m.expenses, m.profit]);
          break;
        case 'drivers':
          headers = ['Chauffeur', 'Feuilles', 'Revenus', 'Dépenses', 'Profit', 'Missions'];
          rows = data.drivers.map(r => [r.name, r.roadSheets, r.revenue, r.expenses, r.profit, r.missions]);
          break;
        case 'fleet':
          headers = ['Véhicule', 'Statut', 'Km', 'Coûts', 'Revenus', 'Profit'];
          rows = data.fleet.map(r => [r.label, r.status, r.mileage, r.totalCost, r.revenue, r.profit]);
          break;
        case 'road_sheets':
          headers = ['Chauffeur', 'Trajet', 'Date', 'Statut', 'Revenu', 'Profit net'];
          rows = data.roadSheets.map(r => [r.driverName, r.route, r.date, r.status, r.revenue, r.netProfit]);
          break;
        case 'invoices':
          headers = ['N°', 'Client', 'Échéance', 'Montant TTC', 'Statut'];
          rows = data.invoices.map(r => [r.number, r.clientName, r.dueDate, r.amountTtc, r.status]);
          break;
        default:
          headers = ['Indicateur', 'Valeur'];
          rows = d ? [
            ['Solde entreprise', d.companyBalance],
            ['Revenus mois', d.monthlyIncome],
            ['Dépenses mois', d.monthlyExpenses],
            ['Profit mois', d.monthlyProfit],
            ['Chauffeurs actifs', d.totalDrivers],
            ['Camions actifs', d.activeTrucks],
            ['Feuilles en attente', d.pendingRoadSheets],
            ['Factures en retard', d.lateInvoices],
          ] : [];
      }

      const csv = rowsToCsv(headers, rows);
      downloadCsv(`zd-rapport-${type}-${date}.csv`, csv);
      await logReportExport(user.id, type, rows.length);
    } catch (err) {
      setExportError((err as Error).message);
    }
  }

  const tabs: { id: ReportTabId; icon: typeof FileBarChart }[] = [
    { id: 'overview', icon: BarChart3 },
    { id: 'finance', icon: TrendingUp },
    { id: 'drivers', icon: Users },
    { id: 'fleet', icon: Truck },
    { id: 'road_sheets', icon: Route },
    { id: 'invoices', icon: Receipt },
  ];

  return (
    <Layout>
      <div className="space-y-6 reports-module">
        <PageHeader
          title="Rapports"
          subtitle="Analyses financières et exports ERP"
          icon={FileBarChart}
          actions={
            <button
              type="button"
              onClick={() => handleExport(tab === 'overview' ? 'overview' : tab)}
              disabled={isLoading}
              className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Exporter CSV
            </button>
          }
        />

        {data?.migrationRequired && (
          <div className="reports-glass rounded-xl p-4 flex items-start gap-3 border border-amber-500/25">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-200">Journal d'exports non installé</p>
              <p className="text-xs text-white/45 mt-1">
                Exécutez <code className="text-amber-300">npx supabase db push</code> (migration 035) — les exports fonctionnent déjà.
              </p>
            </div>
          </div>
        )}

        {exportError && <FormAlert message={exportError} onDismiss={() => setExportError(null)} />}
        {isError && <FormAlert message={(error as { message?: string })?.message ?? 'Erreur de chargement.'} />}

        {d && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Solde', value: formatReportCurrency(d.companyBalance), icon: TrendingUp },
              { label: 'Profit mois', value: formatReportCurrency(d.monthlyProfit), icon: BarChart3 },
              { label: 'Feuilles attente', value: String(d.pendingRoadSheets), icon: Route },
              { label: 'Factures retard', value: String(d.lateInvoices), icon: Receipt },
            ].map((s, i) => (
              <div key={s.label} className="reports-stat-card rounded-xl p-4" style={{ animationDelay: `${i * 40}ms` }}>
                <s.icon className="w-4 h-4 text-red-400 mb-2" />
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-[10px] text-white/35 uppercase">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <nav className="flex gap-1 flex-wrap">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                tab === t.id ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'text-white/35 hover:bg-white/5'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {REPORT_TAB_LABELS[t.id]}
            </button>
          ))}
        </nav>

        {tab === 'overview' && d && (
          <div className="grid md:grid-cols-2 gap-4">
            <ReportsFinanceChart data={data?.monthlyFinance ?? []} loading={isLoading} />
            <div className="reports-glass rounded-xl p-5 space-y-3">
              <h3 className="font-bold text-white">Synthèse ERP</h3>
              {[
                ['Chauffeurs actifs', d.totalDrivers],
                ['Camions actifs', d.activeTrucks],
                ['Feuilles validées', d.validatedRoadSheets],
                ['Rentabilité flotte', formatReportCurrency(d.fleetProfitability)],
                ['Revenus ce mois', formatReportCurrency(d.monthlyIncome)],
                ['Dépenses ce mois', formatReportCurrency(d.monthlyExpenses)],
              ].map(([label, val]) => (
                <div key={String(label)} className="flex justify-between text-sm border-b border-white/5 pb-2">
                  <span className="text-white/40">{label}</span>
                  <span className="text-white font-semibold">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'finance' && (
          <ReportsFinanceChart data={data?.monthlyFinance ?? []} loading={isLoading} />
        )}

        {tab === 'drivers' && (
          <ReportsDataTable
            loading={isLoading}
            headers={['Chauffeur', 'Feuilles', 'Revenus', 'Dépenses', 'Profit', 'Missions']}
            rows={(data?.drivers ?? []).map(r => [
              r.name, r.roadSheets, formatReportCurrency(r.revenue),
              formatReportCurrency(r.expenses), formatReportCurrency(r.profit), r.missions,
            ])}
            emptyMessage="Aucun chauffeur"
          />
        )}

        {tab === 'fleet' && (
          <ReportsDataTable
            loading={isLoading}
            headers={['Véhicule', 'Statut', 'Km', 'Coûts', 'Revenus', 'Profit']}
            rows={(data?.fleet ?? []).map(r => [
              r.label, r.status, r.mileage.toLocaleString('fr-FR'),
              formatReportCurrency(r.totalCost), formatReportCurrency(r.revenue), formatReportCurrency(r.profit),
            ])}
            emptyMessage="Aucun véhicule"
          />
        )}

        {tab === 'road_sheets' && (
          <ReportsDataTable
            loading={isLoading}
            headers={['Chauffeur', 'Trajet', 'Date', 'Statut', 'Revenu', 'Profit']}
            rows={(data?.roadSheets ?? []).map(r => [
              r.driverName, r.route, r.date ? new Date(r.date).toLocaleDateString('fr-FR') : '—',
              r.status, formatReportCurrency(r.revenue), formatReportCurrency(r.netProfit),
            ])}
            emptyMessage="Aucune feuille de route"
          />
        )}

        {tab === 'invoices' && (
          <ReportsDataTable
            loading={isLoading}
            headers={['N° facture', 'Client', 'Échéance', 'Montant TTC', 'Statut']}
            rows={(data?.invoices ?? []).map(r => [
              r.number, r.clientName,
              r.dueDate ? new Date(r.dueDate).toLocaleDateString('fr-FR') : '—',
              formatReportCurrency(r.amountTtc), r.status,
            ])}
            emptyMessage="Aucune facture"
          />
        )}
      </div>
    </Layout>
  );
}
