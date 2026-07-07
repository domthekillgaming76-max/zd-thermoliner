import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Layout } from '../components/Layout';
import { DriverProfileView } from '../components/drivers/DriverProfileView';
import { useDriverDetail } from '../hooks/useDrivers';

export function DriverProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useDriverDetail(id);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-red-400" />
        </div>
      </Layout>
    );
  }

  if (isError || !data) {
    return (
      <Layout>
        <div className="erp-card rounded-2xl p-12 text-center">
          <p className="text-white/50">Chauffeur introuvable.</p>
          <button type="button" onClick={() => navigate('/drivers')} className="mt-4 text-red-400 text-sm">← Retour</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <button type="button" onClick={() => navigate('/drivers')} className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Retour aux chauffeurs
        </button>
        <DriverProfileView {...data} />
      </div>
    </Layout>
  );
}
