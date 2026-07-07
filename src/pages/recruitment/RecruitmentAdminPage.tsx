import { useEffect, useState } from 'react';
import { Shield, Search, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/erp/PageHeader';
import { FormAlert } from '../../components/erp/FormAlert';
import { useAuth } from '../../contexts/AuthContext';
import { isAdministratorEmail } from '../../lib/admin';
import { useAllApplications, useApproveApplication, useRejectApplication } from '../../hooks/useRecruitment';
import { CANDIDATE_TYPE_LABELS, STATUS_LABELS } from '../../lib/recruitmentTypes';
import { supabase } from '../../lib/supabase';

export function RecruitmentAdminPage() {
  const { user, profile } = useAuth();
  const isAdmin = isAdministratorEmail(user?.email ?? profile?.email);
  const { data: applications = [], isLoading, refetch } = useAllApplications(isAdmin);
  const approveMutation = useApproveApplication();
  const rejectMutation = useRejectApplication();
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel('recruitment_admin_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recruitment_applications' }, () => refetch())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [isAdmin, refetch]);

  if (!isAdmin) {
    return (
      <Layout>
        <div className="erp-card rounded-2xl p-12 text-center">
          <Shield className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/50">Accès réservé à l&apos;administrateur DOM76.</p>
        </div>
      </Layout>
    );
  }

  const filtered = applications.filter(a =>
    [a.pseudo, a.email, a.country].some(v => v?.toLowerCase().includes(search.toLowerCase())),
  );

  const selected = applications.find(a => a.id === selectedId);

  async function handleApprove() {
    if (!selectedId) return;
    setError(null);
    try {
      await approveMutation.mutateAsync({ appId: selectedId, notes: notes || undefined });
      setSelectedId(null);
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approbation échouée');
    }
  }

  async function handleReject() {
    if (!selectedId) return;
    setError(null);
    try {
      await rejectMutation.mutateAsync({ appId: selectedId, notes: notes || undefined });
      setSelectedId(null);
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rejet échoué');
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Toutes les candidatures"
          subtitle="Examen et décision — Bureau du PDG"
          icon={Shield}
          actions={
            <button type="button" onClick={() => refetch()} className="px-3 py-2 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Actualiser
            </button>
          }
        />

        {error && <FormAlert message={error} onDismiss={() => setError(null)} />}

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="erp-input w-full pl-9" />
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-2">
            {isLoading ? (
              <div className="h-48 shimmer rounded-2xl" />
            ) : filtered.length === 0 ? (
              <div className="erp-card rounded-2xl p-8 text-center text-white/40">Aucune candidature</div>
            ) : (
              filtered.map(app => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setSelectedId(app.id)}
                  className={`w-full text-left erp-card rounded-xl p-4 transition-all ${selectedId === app.id ? 'border-teal-500/30' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">{app.pseudo}</p>
                      <p className="text-xs text-white/40">{CANDIDATE_TYPE_LABELS[app.candidate_type]} — {app.country}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_LABELS[app.status].color}`}>
                      {STATUS_LABELS[app.status].label}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="erp-card rounded-2xl p-5 sticky top-4 h-fit">
            {!selected ? (
              <p className="text-white/30 text-sm text-center py-8">Sélectionnez une candidature</p>
            ) : (
              <div className="space-y-4">
                <h3 className="font-bold text-white">{selected.pseudo}</h3>
                <p className="text-sm text-white/50">{selected.motivation}</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notes admin..."
                  className="erp-input w-full min-h-[80px] text-sm"
                />
                {selected.status === 'pending' && (
                  <div className="flex gap-2">
                    <button type="button" onClick={handleApprove} disabled={approveMutation.isPending}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50">
                      <CheckCircle className="w-4 h-4" /> Accepter
                    </button>
                    <button type="button" onClick={handleReject} disabled={rejectMutation.isPending}
                      className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50">
                      <XCircle className="w-4 h-4" /> Refuser
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
