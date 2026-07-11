import { KeyRound } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { RolesSalonsPanel } from '../components/admin/RolesSalonsPanel';
import { useAuth } from '../contexts/AuthContext';
import { canAccessAdministration } from '../lib/adminPermissions';
import { Navigate } from 'react-router-dom';

export function RolesSalonsPage() {
  const { profile, user } = useAuth();
  const canManage = canAccessAdministration(profile?.role, user?.email ?? profile?.email);

  if (!canManage) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <PageHeader
        icon={KeyRound}
        title="Rôles et salons"
        subtitle="Gérez les accès par rôle pour chaque salon de l'ERP"
      />
      <RolesSalonsPanel />
    </Layout>
  );
}
