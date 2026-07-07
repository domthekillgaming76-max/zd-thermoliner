import { FileText, Clock } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/erp/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useMyApplication } from '../../hooks/useRecruitment';
import { CANDIDATE_TYPE_LABELS, STATUS_LABELS } from '../../lib/recruitmentTypes';
import { Link } from 'react-router-dom';

export function MyApplicationsPage() {
  const { user } = useAuth();
  const { data: app, isLoading } = useMyApplication(user?.id);

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Mes candidatures"
          subtitle="Suivez l'état de votre dossier de recrutement"
          icon={FileText}
        />

        {isLoading ? (
          <div className="erp-card h-48 shimmer rounded-2xl" />
        ) : !app ? (
          <div className="erp-card rounded-2xl p-12 text-center">
            <Clock className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 mb-4">Aucune candidature déposée.</p>
            <Link to="/recruitment" className="btn-primary inline-flex px-5 py-2.5 rounded-xl text-sm font-semibold">
              Déposer une candidature
            </Link>
          </div>
        ) : (
          <div className="erp-card rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${STATUS_LABELS[app.status].color}`}>
                {STATUS_LABELS[app.status].label}
              </span>
              <span className="text-xs text-white/40">
                {CANDIDATE_TYPE_LABELS[app.candidate_type]} — {new Date(app.created_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><span className="text-white/40">Pseudo :</span> <span className="text-white">{app.pseudo}</span></div>
              <div><span className="text-white/40">Pays :</span> <span className="text-white">{app.country}</span></div>
              <div className="sm:col-span-2"><span className="text-white/40">Motivation :</span> <span className="text-white/70">{app.motivation}</span></div>
            </div>
            {app.admin_notes && (
              <div className="rounded-xl p-4 bg-white/[0.02] border border-white/5">
                <p className="text-xs font-bold text-white/40 uppercase mb-1">Note du PDG</p>
                <p className="text-sm text-white/60">{app.admin_notes}</p>
              </div>
            )}
            {app.status === 'pending' && (
              <Link to="/recruitment" className="text-sm text-teal-400 hover:underline">Modifier ma candidature →</Link>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
