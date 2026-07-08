import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { SalonsManagementPanel } from '../components/admin/SalonsManagementPanel';
import { Layers, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { canAccessAdministration } from '../lib/adminPermissions';

export function SalonsManagementPage() {
  const { profile, user } = useAuth();
  const canManage = canAccessAdministration(profile?.role, user?.email ?? profile?.email);

  if (!canManage) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Lock className="w-16 h-16 opacity-10 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Accès refusé</h1>
          <p className="text-white/30">Réservé aux administrateurs.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Gestion des salons"
          subtitle="Organisez le menu de l'application sans modifier le code"
          icon={Layers}
        />
        <SalonsManagementPanel />
      </div>
    </Layout>
  );
}
