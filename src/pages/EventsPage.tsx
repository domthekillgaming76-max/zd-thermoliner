import { useMemo, useState } from 'react';
import { Calendar, Plus, Radio, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';
import { CommunityEventsList } from '../components/events/CommunityEventsList';
import { LiveConvoysPanel } from '../components/events/LiveConvoysPanel';
import { useAuth } from '../contexts/AuthContext';
import { isAdministratorEmail } from '../lib/admin';
import { computeEventsDashboard, type CommunityEventType } from '../lib/eventTypes';
import { createCommunityEvent, fetchEventsModuleBundle } from '../services/eventsService';

type TabId = 'agenda' | 'convoys';

const MANAGER_ROLES = new Set(['pdg', 'patron', 'admin', 'directeur']);

export function EventsPage() {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>('agenda');
  const [showForm, setShowForm] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    event_type: 'convoy' as CommunityEventType,
    start_at: '',
    location: '',
    route_label: '',
    max_participants: 0,
  });

  const canManage = isAdministratorEmail(user?.email) || MANAGER_ROLES.has(profile?.role ?? '');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['events', 'module'],
    queryFn: fetchEventsModuleBundle,
    staleTime: 20_000,
  });

  const createMutation = useMutation({
    mutationFn: () => createCommunityEvent(form, user!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      setShowForm(false);
      setSuccessMessage('Événement publié.');
      setForm({ title: '', description: '', event_type: 'convoy', start_at: '', location: '', route_label: '', max_participants: 0 });
    },
    onError: (err: Error) => setPageError(err.message),
  });

  const stats = useMemo(
    () => computeEventsDashboard(data?.events ?? [], data?.liveConvoyCount ?? 0),
    [data],
  );

  return (
    <Layout>
      <div className="space-y-6 events-module">
        <PageHeader
          title="Événements publics"
          subtitle="Convois et activités communautaires Z&D"
          icon={Calendar}
          actions={
            canManage && tab === 'agenda' ? (
              <button type="button" onClick={() => setShowForm(true)}
                className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold">
                <Plus className="w-4 h-4" />
                Nouvel événement
              </button>
            ) : undefined
          }
        />

        {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}
        {successMessage && <FormSuccess message={successMessage} onDismiss={() => setSuccessMessage(null)} />}
        {data?.migrationRequired && (
          <div className="events-glass rounded-xl p-4 flex items-start gap-3 border border-amber-500/25">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-200">Agenda non installé</p>
              <p className="text-xs text-white/45 mt-1">Exécutez <code className="text-amber-300">npx supabase db push</code> (migration 032)</p>
            </div>
          </div>
        )}
        {isError && <FormAlert message={(error as { message?: string })?.message ?? 'Erreur de chargement.'} />}

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Événements à venir', value: stats.upcomingEvents, icon: Calendar },
            { label: 'Convois actifs', value: stats.liveConvoys, icon: Radio },
            { label: 'Terminés (mois)', value: stats.completedThisMonth, icon: Calendar },
          ].map((s, i) => (
            <div key={s.label} className="events-stat-card rounded-xl p-4" style={{ animationDelay: `${i * 40}ms` }}>
              <s.icon className="w-4 h-4 text-red-400 mb-2" />
              <p className="text-xl font-black text-white">{s.value}</p>
              <p className="text-[10px] text-white/35 uppercase">{s.label}</p>
            </div>
          ))}
        </div>

        <nav className="flex gap-1">
          {([
            { id: 'agenda' as TabId, label: 'Agenda communautaire' },
            { id: 'convoys' as TabId, label: `Convois live (${data?.liveConvoyCount ?? 0})` },
          ]).map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold ${tab === t.id ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'text-white/35 hover:bg-white/5'}`}>
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'agenda' && (
          <CommunityEventsList events={data?.events ?? []} loading={isLoading} />
        )}

        {tab === 'convoys' && <LiveConvoysPanel />}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="events-glass rounded-2xl w-full max-w-md p-5 border border-white/10 space-y-3">
            <h2 className="font-bold text-white">Nouvel événement</h2>
            <input className="erp-input w-full" placeholder="Titre *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            <textarea className="erp-input w-full min-h-[60px]" placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            <select className="erp-select w-full" value={form.event_type} onChange={e => setForm(p => ({ ...p, event_type: e.target.value as CommunityEventType }))}>
              <option value="convoy">Convoi</option>
              <option value="meetup">Rencontre</option>
              <option value="tournament">Tournoi</option>
              <option value="training">Formation</option>
              <option value="other">Autre</option>
            </select>
            <input type="datetime-local" className="erp-input w-full" value={form.start_at} onChange={e => setForm(p => ({ ...p, start_at: e.target.value }))} />
            <input className="erp-input w-full" placeholder="Lieu" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
            <input className="erp-input w-full" placeholder="Itinéraire (ex: Paris → Lyon)" value={form.route_label} onChange={e => setForm(p => ({ ...p, route_label: e.target.value }))} />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-white/5 rounded-xl text-white/50 text-sm">Annuler</button>
              <button type="button" disabled={!form.title || !form.start_at || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                {createMutation.isPending ? '…' : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
