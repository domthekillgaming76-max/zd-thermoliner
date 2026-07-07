import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Layout } from '../components/Layout';
import { TruckProfileView } from '../components/fleet/TruckProfileView';
import { useFleetTruckDetail } from '../hooks/useFleet';

export function TruckProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useFleetTruckDetail(id);

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
        <div className="fleet-glass rounded-2xl p-12 text-center">
          <p className="text-white/50">Camion introuvable.</p>
          <button type="button" onClick={() => navigate('/fleet')} className="mt-4 text-red-400 text-sm">
            ← Retour à la flotte
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/fleet')}
          className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la flotte
        </button>
        <TruckProfileView
          truck={data.truck}
          costs={data.costs}
          maintenance={data.maintenance}
          assignments={data.assignments}
          documents={data.documents}
          garages={data.garages}
          trailers={data.trailers}
          drivers={data.drivers}
        />
      </div>
    </Layout>
  );
}
