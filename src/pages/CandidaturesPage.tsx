import { useEffect, useState, useCallback } from 'react';
import { UserCheck, UserX, Clock, CheckCircle, XCircle, Search, ChevronDown, User, Calendar, MessageSquare, Gamepad2, Truck as TruckIcon, RefreshCw } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase, RecruitmentApplication, Profile } from '../lib/supabase';

export function CandidaturesPage() {
  const { profile } = useAuth();
  const [applications, setApplications] = useState<(RecruitmentApplication & { profiles?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedApp, setSelectedApp] = useState<typeof applications[0] | null>(null);

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('recruitment_applications')
        .select('*, profiles:user_id (id, full_name, pseudo, avatar_url, email, role)')
        .order('created_at', { ascending: false });

      if (data) setApplications(data as unknown as typeof applications);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile?.role !== 'pdg' && profile?.role !== 'patron') return;
    loadApplications();
    const channel = supabase
      .channel('candidatures_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recruitment_applications' }, () => loadApplications())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [profile?.role, loadApplications]);

  async function handleApprove(appId: string, role: 'chauffeur' | 'tractionnaire') {
    await supabase.rpc('approve_application', { app_id: appId, assigned_role: role });
    loadApplications();
    setSelectedApp(null);
  }

  async function handleReject(appId: string) {
    await supabase.rpc('reject_application', { app_id: appId });
    loadApplications();
    setSelectedApp(null);
  }

  const filteredApps = applications.filter(app => {
    const matchesSearch = app.pseudo.toLowerCase().includes(search.toLowerCase()) ||
                          app.email.toLowerCase().includes(search.toLowerCase()) ||
                          app.discord.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;

  // Role check
  if (profile?.role !== 'pdg' && profile?.role !== 'patron') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <UserCheck className="w-16 h-16 text-dark-600 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Acces refuse</h1>
          <p className="text-dark-400">Seuls le PDG et le Patron peuvent acceder a cette page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-primary-500" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Candidatures</h1>
              <p className="text-dark-400">Gestion des demandes de recrutement</p>
            </div>
          </div>
          <button onClick={() => loadApplications()} className="p-2 hover:bg-dark-800 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4 text-dark-400" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`p-4 rounded-xl border transition-all ${
              statusFilter === 'pending'
                ? 'bg-yellow-500/10 border-yellow-500/50'
                : 'bg-dark-900 border-dark-800 hover:border-dark-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span className="text-dark-400">En attente</span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{pendingCount}</p>
          </button>

          <button
            onClick={() => setStatusFilter('approved')}
            className={`p-4 rounded-xl border transition-all ${
              statusFilter === 'approved'
                ? 'bg-emerald-500/10 border-emerald-500/50'
                : 'bg-dark-900 border-dark-800 hover:border-dark-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span className="text-dark-400">Acceptees</span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{approvedCount}</p>
          </button>

          <button
            onClick={() => setStatusFilter('rejected')}
            className={`p-4 rounded-xl border transition-all ${
              statusFilter === 'rejected'
                ? 'bg-primary-500/10 border-primary-500/50'
                : 'bg-dark-900 border-dark-800 hover:border-dark-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-primary-500" />
              <span className="text-dark-400">Refusees</span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{rejectedCount}</p>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par pseudo, email, discord..."
            className="w-full pl-12 pr-4 py-3 bg-dark-900 border border-dark-800 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
          />
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="text-center py-12 text-dark-400">Chargement...</div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-12 bg-dark-900 border border-dark-800 rounded-2xl">
            <UserCheck className="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <p className="text-dark-400">Aucune candidature trouvee</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApps.map(app => (
              <div
                key={app.id}
                className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden hover:border-dark-700 transition-colors"
              >
                {/* Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{app.pseudo}</h3>
                      <p className="text-sm text-dark-400">{app.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      app.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                      app.status === 'rejected' ? 'bg-primary-500/20 text-primary-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {app.status === 'approved' ? 'Accepte' :
                       app.status === 'rejected' ? 'Refuse' : 'En attente'}
                    </span>
                    <button
                      onClick={() => setSelectedApp(selectedApp?.id === app.id ? null : app)}
                      className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-white"
                    >
                      <ChevronDown className={`w-5 h-5 transition-transform ${selectedApp?.id === app.id ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedApp?.id === app.id && (
                  <div className="p-4 border-t border-dark-800 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-dark-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-dark-400 mb-1">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs">Age</span>
                        </div>
                        <p className="font-medium text-white">{app.age} ans</p>
                      </div>
                      <div className="bg-dark-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-dark-400 mb-1">
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-xs">Discord</span>
                        </div>
                        <p className="font-medium text-white">{app.discord}</p>
                      </div>
                      <div className="bg-dark-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-dark-400 mb-1">
                          <Gamepad2 className="w-4 h-4" />
                          <span className="text-xs">TrucksBook</span>
                        </div>
                        <p className="font-medium text-white">{app.has_trucksbook ? 'Oui' : 'Non'}</p>
                      </div>
                      <div className="bg-dark-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-dark-400 mb-1">
                          <TruckIcon className="w-4 h-4" />
                          <span className="text-xs">Camion prefere</span>
                        </div>
                        <p className="font-medium text-white">{app.preferred_truck || '-'}</p>
                      </div>
                    </div>

                    <div className="bg-dark-800 rounded-lg p-3">
                      <p className="text-xs text-dark-400 mb-1">Experience ETS2</p>
                      <p className="text-white">{app.ets2_experience}</p>
                    </div>

                    <div className="bg-dark-800 rounded-lg p-3">
                      <p className="text-xs text-dark-400 mb-1">Motivation</p>
                      <p className="text-white">{app.motivation}</p>
                    </div>

                    {app.availability && (
                      <div className="bg-dark-800 rounded-lg p-3">
                        <p className="text-xs text-dark-400 mb-1">Disponibilites</p>
                        <p className="text-white">{app.availability}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {app.status === 'pending' && (
                      <div className="flex flex-wrap gap-3 pt-4 border-t border-dark-800">
                        <button
                          onClick={() => handleApprove(app.id, 'chauffeur')}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl font-medium transition-colors"
                        >
                          <UserCheck className="w-5 h-5" />
                          Chauffeur
                        </button>
                        <button
                          onClick={() => handleApprove(app.id, 'tractionnaire')}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl font-medium transition-colors"
                        >
                          <TruckIcon className="w-5 h-5" />
                          Tractionnaire
                        </button>
                        <button
                          onClick={() => handleReject(app.id)}
                          className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 rounded-xl font-medium transition-colors"
                        >
                          <UserX className="w-5 h-5" />
                          Refuser
                        </button>
                      </div>
                    )}

                    {app.status !== 'pending' && (
                      <div className="text-sm text-dark-400 pt-4 border-t border-dark-800">
                        {app.status === 'approved' ? (
                          <>
                            Accepte comme <span className="font-medium text-emerald-400">{app.assigned_role}</span>
                            {app.reviewed_at && (
                              <span> le {new Date(app.reviewed_at).toLocaleDateString('fr-FR')}</span>
                            )}
                          </>
                        ) : (
                          <>
                            Refuse
                            {app.reviewed_at && (
                              <span> le {new Date(app.reviewed_at).toLocaleDateString('fr-FR')}</span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
