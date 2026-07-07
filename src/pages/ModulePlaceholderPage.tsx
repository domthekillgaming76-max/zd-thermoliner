import { Link } from 'react-router-dom';
import type { ElementType } from 'react';
import { Construction } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp';

interface ModulePlaceholderPageProps {
  title: string;
  description: string;
  icon: ElementType;
  backTo?: string;
}

export function ModulePlaceholderPage({ title, description, icon, backTo = '/dashboard' }: ModulePlaceholderPageProps) {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader title={title} subtitle={description} icon={icon} />
        <div className="erp-card rounded-2xl p-8 md:p-12 text-center max-w-lg mx-auto">
          <Construction className="w-12 h-12 text-amber-400/60 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Module en cours de développement</h2>
          <p className="text-white/40 text-sm mb-6">
            Ce module fait partie de la plateforme ERP Z&D Thermoliner et sera disponible prochainement.
          </p>
          <Link
            to={backTo}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white btn-primary"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </Layout>
  );
}
