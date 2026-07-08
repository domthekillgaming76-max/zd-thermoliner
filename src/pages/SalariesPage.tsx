import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, RefreshCw } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';
import { FinanceSalariesTable } from '../components/finance/FinanceSalariesTable';
import { useAuth } from '../contexts/AuthContext';
import { useDriverSalaries, usePayDriverSalary } from '../hooks/useFinance';
import {
  canAccessSalariesPage,
  canPayDriverSalary,
  canViewAllSalaries,
} from '../lib/financePermissions';
import { fetchDriverByUserId } from '../services/roadSheetService';

export function SalariesPage() {
  const { profile, user } = useAuth();
  const canAccess = canAccessSalariesPage(profile?.role, user?.email);
  const canPay = canPayDriverSalary(profile?.role, user?.email);
  const viewAll = canViewAllSalaries(profile?.role, user?.email);
  const [driverId, setDriverId] = useState<string | undefined>(undefined);
  const [resolved, setResolved] = useState(viewAll);

  useEffect(() => {
    if (viewAll || !user?.id) {
      setResolved(true);
      return;
    }
    fetchDriverByUserId(user.id).then(d => {
      setDriverId(d?.id);
      setResolved(true);
    });
  }, [user?.id, viewAll]);

  const { data: salaries = [], isLoading, isError, error, refetch, isFetching } = useDriverSalaries(
    viewAll ? undefined : driverId,
  );
  const paySalary = usePayDriverSalary();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  if (!canAccess) {
    return <Navigate to="/dashboard" replace state={{ accessDenied: 'Accès réservé aux salaires.' }} />;
  }

  async function handlePay(id: string) {
    if (!user?.id) return;
    setBusyId(id);
    setPageError(null);
    try {
      await paySalary.mutateAsync({ salaryId: id, userId: user.id });
      setSuccess('Salaire payé — dépense enregistrée en banque.');
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Erreur paiement salaire.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <PageHeader
            title="Salaires chauffeurs"
            subtitle={viewAll ? 'Gestion des salaires et primes' : 'Votre historique de rémunération'}
            icon={Users}
          />
          <button type="button" onClick={() => refetch()} disabled={isFetching}
            className="btn-secondary px-4 py-2 rounded-xl text-sm flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}
        {success && <FormSuccess message={success} onDismiss={() => setSuccess(null)} />}
        {isError && <FormAlert message={error instanceof Error ? error.message : 'Erreur chargement.'} />}

        {!resolved || isLoading ? (
          <div className="erp-card rounded-2xl h-64 shimmer" />
        ) : (
          <FinanceSalariesTable
            salaries={salaries}
            canPay={canPay}
            onPay={handlePay}
            busyId={busyId}
          />
        )}
      </div>
    </Layout>
  );
}
