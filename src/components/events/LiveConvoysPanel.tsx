import { useState, useEffect, useCallback } from 'react';
import {
  Truck, RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type ConvoyStatus = 'en_route' | 'pause' | 'arrive' | 'annule';

type LiveConvoy = {
  id: string;
  driver_name: string;
  truck_name: string | null;
  route_label: string;
  cargo: string;
  distance_total: number;
  distance_done: number;
  progress_percent: number;
  speed_kmh: number | null;
  status: ConvoyStatus;
  started_at: string;
};

const ROLE_LEVELS: Record<string, number> = {
  pdg: 100, patron: 90, directeur: 70, dispatcher: 50, chauffeur: 30, tractionnaire: 20, candidat: 10,
};

const STATUS_CONFIG: Record<ConvoyStatus, { label: string; color: string; bg: string; dot: string }> = {
  en_route: { label: 'En route', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', dot: 'bg-blue-400' },
  pause: { label: 'En pause', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', dot: 'bg-amber-400' },
  arrive: { label: 'Arrivé', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-400' },
  annule: { label: 'Annulé', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', dot: 'bg-red-400' },
};

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `Il y a ${h}h ${m}m`;
  return `Il y a ${m}m`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function LiveConvoysPanel() {
  const { profile } = useAuth();
  const [convoys, setConvoys] = useState<LiveConvoy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [progressInput, setProgressInput] = useState<Record<string, { progress: string; speed: string }>>({});
  const [tab, setTab] = useState<ConvoyStatus | 'all'>('en_route');

  const canEdit = (ROLE_LEVELS[profile?.role ?? ''] ?? 0) >= 30;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('live_convoys')
      .select('id, driver_name, truck_name, route_label, cargo, distance_total, distance_done, progress_percent, speed_kmh, status, started_at')
      .order('started_at', { ascending: false })
      .limit(100);
    if (err) setError(err.message);
    else setConvoys((data ?? []) as LiveConvoy[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('live_convoys_panel_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_convoys' }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  async function updateProgress(convoy: LiveConvoy) {
    const vals = progressInput[convoy.id];
    if (!vals) return;
    const progress = Math.min(100, Math.max(0, parseInt(vals.progress, 10) || 0));
    const speed = parseInt(vals.speed, 10) || null;
    const distDone = Math.round((progress / 100) * convoy.distance_total);
    const { error: err } = await supabase.from('live_convoys').update({
      progress_percent: progress,
      distance_done: distDone,
      speed_kmh: speed,
      status: progress >= 100 ? 'arrive' : convoy.status,
    }).eq('id', convoy.id);
    if (err) { setError(err.message); return; }
    setUpdatingId(null);
    setSuccess('Progression mise à jour');
    setTimeout(() => setSuccess(null), 2500);
    load();
  }

  async function markStatus(id: string, status: ConvoyStatus) {
    const { error: err } = await supabase.from('live_convoys').update({
      status,
      ...(status === 'arrive' ? { progress_percent: 100, distance_done: convoys.find(c => c.id === id)?.distance_total } : {}),
    }).eq('id', id);
    if (err) setError(err.message);
    else load();
  }

  const tabs: { key: ConvoyStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'en_route', label: 'En route' },
    { key: 'pause', label: 'En pause' },
    { key: 'arrive', label: 'Arrivés' },
  ];

  const displayed = convoys.filter(c => tab === 'all' || c.status === tab);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/50 hover:bg-white/5 border border-white/8">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {error && <div className="events-glass rounded-xl p-3 text-sm text-red-400 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
      {success && <div className="events-glass rounded-xl p-3 text-sm text-emerald-400">{success}</div>}

      <div className="flex gap-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === t.key ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'text-white/35 hover:bg-white/5'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="events-glass h-32 shimmer rounded-xl" />)}</div>
      ) : displayed.length === 0 ? (
        <div className="events-glass rounded-2xl p-12 text-center">
          <Truck className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/30">Aucun convoi en cours</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(convoy => {
            const cfg = STATUS_CONFIG[convoy.status];
            const isEditing = updatingId === convoy.id;
            const editVals = progressInput[convoy.id] || { progress: String(convoy.progress_percent), speed: String(convoy.speed_kmh || '') };

            return (
              <div key={convoy.id} className="events-glass events-card-hover rounded-xl p-4 border border-white/5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      <span className="font-bold text-white">{convoy.route_label}</span>
                    </div>
                    <p className="text-xs text-white/40">{convoy.cargo} · {convoy.driver_name}{convoy.truck_name ? ` · ${convoy.truck_name}` : ''}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">Départ {formatTime(convoy.started_at)} · {timeSince(convoy.started_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-white">{convoy.progress_percent}%</p>
                    <p className="text-[10px] text-white/30">{convoy.distance_done}/{convoy.distance_total} km</p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-3">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all"
                    style={{ width: `${convoy.progress_percent}%` }} />
                </div>
                {canEdit && convoy.status !== 'arrive' && convoy.status !== 'annule' && (
                  <div className="flex flex-wrap gap-2">
                    {!isEditing ? (
                      <>
                        <button type="button" onClick={() => { setUpdatingId(convoy.id); setProgressInput(p => ({ ...p, [convoy.id]: editVals })); }}
                          className="text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">Mettre à jour</button>
                        {convoy.status === 'en_route' && (
                          <button type="button" onClick={() => markStatus(convoy.id, 'pause')} className="text-xs px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400">Pause</button>
                        )}
                        {convoy.status === 'pause' && (
                          <button type="button" onClick={() => markStatus(convoy.id, 'en_route')} className="text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400">Reprendre</button>
                        )}
                        <button type="button" onClick={() => markStatus(convoy.id, 'arrive')} className="text-xs px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400">Arrivé</button>
                      </>
                    ) : (
                      <>
                        <input type="number" min={0} max={100} value={editVals.progress}
                          onChange={e => setProgressInput(p => ({ ...p, [convoy.id]: { ...editVals, progress: e.target.value } }))}
                          className="erp-input w-16 text-xs text-center" />
                        <button type="button" onClick={() => updateProgress(convoy)} className="text-xs btn-primary px-3 py-1 rounded-lg">OK</button>
                        <button type="button" onClick={() => setUpdatingId(null)} className="text-xs text-white/40">Annuler</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
