import { Link } from 'react-router-dom';
import { BarChart3, Users, Calculator, RefreshCw } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert } from '../components/erp/FormAlert';
import { FinanceKpiGrid } from '../components/finance/FinanceKpiGrid';
import { FinanceInvoicesTable } from '../components/finance/FinanceInvoicesTable';
import { FinanceSalariesTable } from '../components/finance/FinanceSalariesTable';
import { useAuth } from '../contexts/AuthContext';
import { useFinanceModule } from '../hooks/useFinance';
import { canAccessFinanceModule } from '../lib/financePermissions';
import { canAccessBank } from '../lib/bankPermissions';
import { Navigate } from 'react-router-dom';

const QUICK_LINKS = [
  { to: '/salaries', icon: Users, label: 'Salaires' },
  { to: '/accounting', icon: Calculator, label: 'Comptabilité' },
  { to: '/bank', icon: BarChart3, label: 'Banque', adminOnly: true },
];

export function FinancePage() {
  const { profile, user } = useAuth();
  const canAccess = canAccessFinanceModule(profile?.role, user?.email);
  const showBank = canAccessBank(profile?.role, user?.email);
  const quickLinks = QUICK_LINKS.filter(l => !l.adminOnly || showBank);
  const { data, isLoading, isError, error, refetch, isFetching } = useFinanceModule();

  if (!canAccess) {
    return <Navigate to="/dashboard" replace state={{ accessDenied: 'Accès réservé au module finance.' }} />;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <PageHeader
            title="Finance"
            subtitle="Tableau de bord comptable Z&D Thermoliner"
            icon={BarChart3}
          />
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary px-4 py-2 rounded-xl text-sm flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {isError && <FormAlert message={error instanceof Error ? error.message : 'Erreur chargement finance.'} />}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="erp-card rounded-2xl p-4 flex items-center gap-3 hover:border-red-500/30 transition-colors"
            >
              <link.icon className="w-5 h-5 text-red-400" />
              <span className="text-sm font-semibold text-white">{link.label}</span>
            </Link>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="erp-card rounded-2xl h-24 shimmer" />
            ))}
          </div>
        ) : data ? (
          <>
            <FinanceKpiGrid dashboard={data.dashboard} />
            <div className="grid xl:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white">Factures récentes</h2>
                </div>
                <FinanceInvoicesTable invoices={data.recentInvoices} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white">Salaires à payer</h2>
                  <Link to="/salaries" className="text-xs text-red-400 hover:text-red-300">Voir tout</Link>
                </div>
                <FinanceSalariesTable salaries={data.pendingSalaries} />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
