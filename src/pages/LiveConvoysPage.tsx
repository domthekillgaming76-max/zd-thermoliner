import { useState, useEffect, useCallback } from 'react';
import {
  Truck, Package, CheckCircle, Pause,
  Play, RefreshCw, AlertTriangle, Clock, BarChart2, XCircle, Radio,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';

type ConvoyStatus = 'en_route' | 'pause' | 'arrive' | 'annule';

type LiveConvoy = {
  id: string;
  road_sheet_id: string | null;
  freight_id: string | null;
  driver_id: string | null;
  driver_user_id: string | null;
  driver_name: string;
  truck_id: string | null;
  truck_name: string | null;
  route_label: string;
  cargo: string;
  distance_total: number;
  distance_done: number;
  progress_percent: number;
  speed_kmh: number | null;
  status: ConvoyStatus;
  started_at: string;
  updated_at: string;
  notes: string | null;
};

const ROLE_LEVELS: Record<string, number> = {
  pdg: 100, patron: 90, directeur: 70, dispatcher: 50, chauffeur: 30, tractionnaire: 20, candidat: 10,
};

const STATUS_CONFIG: Record<ConvoyStatus, { label: string; color: string; bg: string; dot: string }> = {
  en_route: { label: 'En route', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', dot: 'bg-blue-400' },
  pause:    { label: 'En pause', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', dot: 'bg-amber-400' },
  arrive:   { label: 'Arrivé', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-400' },
  annule:   { label: 'Annulé', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', dot: 'bg-red-400' },
};

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `Il y a ${h}h ${m}m`;
  return `Il y a ${m}m`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function LiveConvoysPage() {
  const { profile } = useAuth();

  const [convoys, setConvoys] = useState<LiveConvoy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [progressInput, setProgressInput] = useState<Record<string, { progress: string; speed: string }>>({});
  const [tab, setTab] = useState<ConvoyStatus | 'all'>('en_route');

  const userLevel = profile ? (ROLE_LEVELS[profile.role] || 0) : 0;
  const canEdit = userLevel >= 30;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('live_convoys')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100);
    if (err) setError(err.message);
    else if (data) setConvoys(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('live_convoys_rt')
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
    setProgressInput(prev => { const n = { ...prev }; delete n[convoy.id]; return n; });
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
    { key: 'annule', label: 'Annulés' },
  ];

  const displayed = convoys.filter(c => tab === 'all' || c.status === tab);
  const activeCount = convoys.filter(c => c.status === 'en_route').length;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(229,9,20,0.12)', border: '1px solid rgba(229,9,20,0.2)' }}>
              <Radio className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Convois en direct</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {activeCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-xs font-medium text-blue-400">{activeCount} convoi(s) actif(s)</span>
                  </div>
                )}
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {convoys.length} au total
                </span>
              </div>
            </div>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-emerald-400 text-sm"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.key ? 'text-white' : 'text-white/40 hover:text-white/70'
              }`}
              style={tab === t.key ? {
                background: 'linear-gradient(135deg, rgba(229,9,20,0.2), rgba(229,9,20,0.08))',
                border: '1px solid rgba(229,9,20,0.35)',
              } : {
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
              {t.label}
              <span className="ml-2 text-xs opacity-60">
                {t.key === 'all' ? convoys.length : convoys.filter(c => c.status === t.key).length}
              </span>
            </button>
          ))}
        </div>

        {/* Convoys */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl shimmer" style={{ background: 'rgba(255,255,255,0.03)' }} />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Truck className="w-16 h-16 mb-4 opacity-10" />
            <p className="text-white/30 text-lg font-semibold">Aucun convoi</p>
            <p className="text-white/20 text-sm mt-1">Prenez un fret depuis la Bourse de fret pour démarrer un convoi</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map(convoy => {
              const cfg = STATUS_CONFIG[convoy.status];
              const isEditing = updatingId === convoy.id;
              const editVals = progressInput[convoy.id] || { progress: String(convoy.progress_percent), speed: String(convoy.speed_kmh || '') };

              return (
                <div key={convoy.id} className="card-premium rounded-2xl overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(22,22,22,0.98), rgba(13,13,13,0.98))' }}>

                  {/* Top section */}
                  <div className="p-5 pb-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* Route + driver info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <div className={`flex items-center gap-1.5 text-xs font-bold uppercase px-2.5 py-1 rounded-lg border ${cfg.bg} ${cfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${convoy.status === 'en_route' ? 'animate-pulse' : ''}`} />
                            {cfg.label}
                          </div>
                          <span className="text-white font-black text-lg">{convoy.route_label}</span>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/50">
                          <div className="flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-white/30" />
                            {convoy.cargo}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-white/30" />
                            {convoy.driver_name}
                            {convoy.truck_name && <span className="text-white/30">· {convoy.truck_name}</span>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-white/30" />
                            Départ {formatDate(convoy.started_at)} · {timeSince(convoy.started_at)}
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-center">
                          <p className="text-white font-black text-xl leading-none">
                            {convoy.distance_done}
                            <span className="text-xs text-white/30 font-normal ml-0.5">/{convoy.distance_total} km</span>
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-white/30 mt-0.5">Distance</p>
                        </div>
                        {convoy.speed_kmh && (
                          <div className="text-center">
                            <p className="text-blue-400 font-black text-xl leading-none">{convoy.speed_kmh}</p>
                            <p className="text-[10px] uppercase tracking-wider text-white/30 mt-0.5">km/h</p>
                          </div>
                        )}
                        <div className="text-center">
                          <p className={`font-black text-xl leading-none ${convoy.progress_percent >= 100 ? 'text-emerald-400' : 'text-white'}`}>
                            {convoy.progress_percent}%
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-white/30 mt-0.5">Progression</p>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full progress-neon transition-all duration-700"
                        style={{
                          width: `${convoy.progress_percent}%`,
                          background: convoy.progress_percent >= 100
                            ? 'linear-gradient(90deg, #059669, #10b981)'
                            : 'linear-gradient(90deg, #1d4ed8, #3b82f6, #60a5fa)',
                          boxShadow: convoy.progress_percent >= 100
                            ? '0 0 8px rgba(16,185,129,0.5)'
                            : '0 0 8px rgba(59,130,246,0.5)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Action bar */}
                  {canEdit && convoy.status !== 'arrive' && convoy.status !== 'annule' && (
                    <div className="px-5 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      {!isEditing ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={() => { setUpdatingId(convoy.id); setProgressInput(prev => ({ ...prev, [convoy.id]: { progress: String(convoy.progress_percent), speed: String(convoy.speed_kmh || '') } })); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa' }}>
                            <BarChart2 className="w-3.5 h-3.5" />
                            Mettre à jour
                          </button>

                          {convoy.status === 'en_route' && (
                            <button onClick={() => markStatus(convoy.id, 'pause')}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }}>
                              <Pause className="w-3.5 h-3.5" />
                              Pause
                            </button>
                          )}

                          {convoy.status === 'pause' && (
                            <button onClick={() => markStatus(convoy.id, 'en_route')}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa' }}>
                              <Play className="w-3.5 h-3.5" />
                              Reprendre
                            </button>
                          )}

                          <button onClick={() => markStatus(convoy.id, 'arrive')}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold btn-primary text-white transition-all">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Marquer arrivé
                          </button>

                          <button onClick={() => markStatus(convoy.id, 'annule')}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ml-auto"
                            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.7)' }}>
                            <XCircle className="w-3.5 h-3.5" />
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-white/40">Progression %</label>
                            <input
                              type="number" min={0} max={100}
                              value={editVals.progress}
                              onChange={e => setProgressInput(prev => ({ ...prev, [convoy.id]: { ...editVals, progress: e.target.value } }))}
                              className="w-20 px-3 py-1.5 rounded-xl text-sm text-white text-center outline-none"
                              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-white/40">Vitesse km/h</label>
                            <input
                              type="number" min={0} max={200}
                              value={editVals.speed}
                              onChange={e => setProgressInput(prev => ({ ...prev, [convoy.id]: { ...editVals, speed: e.target.value } }))}
                              className="w-20 px-3 py-1.5 rounded-xl text-sm text-white text-center outline-none"
                              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
                            />
                          </div>
                          <button onClick={() => updateProgress(convoy)}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold btn-primary text-white">
                            Valider
                          </button>
                          <button onClick={() => setUpdatingId(null)}
                            className="px-3 py-1.5 rounded-xl text-xs text-white/40 transition-all hover:bg-white/5"
                            style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                            Annuler
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Arrived/cancelled state */}
                  {(convoy.status === 'arrive' || convoy.status === 'annule') && (
                    <div className="px-5 py-3 border-t flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      {convoy.status === 'arrive'
                        ? <><CheckCircle className="w-4 h-4 text-emerald-400" /><span className="text-xs text-emerald-400 font-medium">Livraison complétée</span></>
                        : <><XCircle className="w-4 h-4 text-red-400/60" /><span className="text-xs text-red-400/60 font-medium">Convoi annulé</span></>
                      }
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
