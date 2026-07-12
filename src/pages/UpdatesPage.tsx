import { useState, useEffect, useCallback } from 'react';
import {
  Zap, Wrench, AlertTriangle, Megaphone, Plus, Edit3, Trash2,
  Send, EyeOff, X, Save, Users, Calendar, CheckCircle,
  Clock, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { canManageUpdates } from '../lib/updatesPermissions';
import { supabase } from '../lib/supabase';

type UpdateType = 'nouveaute' | 'correction' | 'maintenance' | 'annonce';
type UpdateStatus = 'brouillon' | 'publiee';

type AppUpdate = {
  id: string;
  title: string;
  description: string;
  version: string;
  update_type: UpdateType;
  status: UpdateStatus;
  created_by: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  read_count?: number;
  is_read?: boolean;
};

const TYPE_CONFIG: Record<UpdateType, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  nouveaute:   { label: 'Nouveauté',  color: 'text-blue-400',    bg: 'rgba(59,130,246,0.1)',   border: 'rgba(59,130,246,0.3)',   icon: Zap },
  correction:  { label: 'Correction', color: 'text-emerald-400', bg: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.3)',   icon: Wrench },
  maintenance: { label: 'Maintenance',color: 'text-amber-400',   bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.3)',   icon: AlertTriangle },
  annonce:     { label: 'Annonce',    color: 'text-red-400',     bg: 'rgba(229,9,20,0.1)',      border: 'rgba(229,9,20,0.3)',     icon: Megaphone },
};

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}
function formatDateTime(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const EMPTY_FORM = { title: '', description: '', version: 'v1.0.0', update_type: 'nouveaute' as UpdateType };

export function UpdatesPage() {
  const { profile, user } = useAuth();
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [readCounts, setReadCounts] = useState<Record<string, number>>({});

  const canManage = canManageUpdates(profile?.role, user?.email ?? profile?.email);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: updatesData } = await supabase
      .from('app_updates')
      .select('*')
      .order('created_at', { ascending: false });

    if (updatesData) {
      const ids = updatesData.map(u => u.id);
      // Get read status for current user and counts
      const [readsRes, countsRes] = await Promise.all([
        supabase.from('update_reads').select('update_id').eq('user_id', profile?.id || '').in('update_id', ids),
        canManage
          ? supabase.from('update_reads').select('update_id').in('update_id', ids)
          : Promise.resolve({ data: [] }),
      ]);

      const readSet = new Set((readsRes.data || []).map((r: { update_id: string }) => r.update_id));
      const counts: Record<string, number> = {};
      (countsRes.data || []).forEach((r: { update_id: string }) => {
        counts[r.update_id] = (counts[r.update_id] || 0) + 1;
      });
      setReadCounts(counts);

      setUpdates(updatesData.map(u => ({
        ...u,
        is_read: readSet.has(u.id),
        read_count: counts[u.id] || 0,
      })));
    }
    setLoading(false);
  }, [profile?.id, canManage]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('updates_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_updates' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'update_reads' }, () => load())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [load]);

  async function markRead(updateId: string) {
    if (!profile) return;
    await supabase.from('update_reads').upsert({
      update_id: updateId,
      user_id: profile.id,
    }, { onConflict: 'update_id,user_id' });
    setUpdates(prev => prev.map(u => u.id === updateId ? { ...u, is_read: true } : u));
  }

  async function saveUpdate() {
    if (!profile || !form.title.trim() || !form.description.trim()) {
      setError('Titre et description sont obligatoires.');
      return;
    }
    setSaving(true);
    setError(null);

    if (editingId) {
      const { error: err } = await supabase.from('app_updates').update({
        title: form.title,
        description: form.description,
        version: form.version,
        update_type: form.update_type,
      }).eq('id', editingId);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('app_updates').insert({
        title: form.title,
        description: form.description,
        version: form.version,
        update_type: form.update_type,
        created_by: profile.id,
        status: 'brouillon',
      });
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSaving(false);
    setSuccess(editingId ? 'Mise à jour modifiée.' : 'Brouillon créé.');
    setTimeout(() => setSuccess(null), 3000);
    await load();
  }

  async function publishUpdate(id: string) {
    setPublishing(id);
    const { error: err } = await supabase.rpc('publish_update', { update_id: id });
    if (err) { setError(err.message); } else {
      setSuccess('Mise à jour publiée ! Tous les membres ont été notifiés.');
      setTimeout(() => setSuccess(null), 4000);
    }
    setPublishing(null);
    await load();
  }

  async function unpublishUpdate(id: string) {
    await supabase.from('app_updates').update({ status: 'brouillon', published_at: null }).eq('id', id);
    await load();
  }

  async function deleteUpdate(id: string) {
    if (!confirm('Supprimer cette mise à jour ?')) return;
    await supabase.from('app_updates').delete().eq('id', id);
    setUpdates(prev => prev.filter(u => u.id !== id));
  }

  function startEdit(u: AppUpdate) {
    setEditingId(u.id);
    setForm({ title: u.title, description: u.description, version: u.version, update_type: u.update_type });
    setShowForm(true);
    setError(null);
  }

  const publishedUpdates = updates.filter(u => u.status === 'publiee');
  const draftUpdates = updates.filter(u => u.status === 'brouillon');
  const unreadCount = publishedUpdates.filter(u => !u.is_read).length;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(229,9,20,0.12)', border: '1px solid rgba(229,9,20,0.2)' }}>
              <Megaphone className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Mises à jour</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {unreadCount > 0 && (
                  <span className="text-xs font-bold text-red-400 px-2 py-0.5 rounded-lg"
                    style={{ background: 'rgba(229,9,20,0.12)', border: '1px solid rgba(229,9,20,0.2)' }}>
                    {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
                <span className="text-xs text-white/25">{publishedUpdates.length} publiée{publishedUpdates.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
              style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {canManage && (
              <button onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); setError(null); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold btn-primary text-white transition-all">
                <Plus className="w-4 h-4" />
                Nouvelle mise à jour
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-emerald-400 text-sm"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <CheckCircle className="w-4 h-4 flex-shrink-0" />{success}
          </div>
        )}

        {/* Create / Edit Form */}
        {showForm && canManage && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(22,22,22,0.98), rgba(13,13,13,0.98))', border: '1px solid rgba(229,9,20,0.2)' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <h2 className="text-white font-bold">{editingId ? 'Modifier la mise à jour' : 'Nouvelle mise à jour'}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); setError(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/40 mb-2">Version *</label>
                  <input value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))}
                    placeholder="v1.1.0"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-2">Type *</label>
                  <select value={form.update_type} onChange={e => setForm(p => ({ ...p, update_type: e.target.value as UpdateType }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white/80 outline-none"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <option value="nouveaute">Nouveauté</option>
                    <option value="correction">Correction</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="annonce">Annonce urgente</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-2">Titre *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Titre de la mise à jour..."
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-2">Description / Notes *</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Décris les changements, nouveautés, corrections..."
                  rows={6}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white/80 outline-none resize-none"
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setEditingId(null); setError(null); }}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                  Annuler
                </button>
                <button onClick={saveUpdate} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold btn-primary text-white transition-all disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  {saving ? 'Sauvegarde...' : editingId ? 'Sauvegarder' : 'Créer le brouillon'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PDG Drafts section */}
        {canManage && draftUpdates.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-white/25 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Brouillons ({draftUpdates.length})
            </p>
            {draftUpdates.map(u => {
              const cfg = TYPE_CONFIG[u.update_type];
              return (
                <div key={u.id} className="rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="px-5 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-black tracking-wider text-white/30 uppercase">BROUILLON</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {u.version}
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-lg border"
                          style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.color.replace('text-', '') }}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="font-bold text-white/70 truncate">{u.title}</p>
                      <p className="text-xs text-white/30 mt-0.5">Créé le {formatDateTime(u.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => startEdit(u)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-white/10"
                        style={{ color: 'rgba(255,255,255,0.4)' }}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => publishUpdate(u.id)} disabled={publishing === u.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold btn-primary text-white transition-all disabled:opacity-50">
                        <Send className="w-3 h-3" />
                        {publishing === u.id ? '...' : 'Publier'}
                      </button>
                      <button onClick={() => deleteUpdate(u.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-red-500/10"
                        style={{ color: 'rgba(239,68,68,0.5)' }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Published Updates */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 rounded-2xl shimmer" style={{ background: 'rgba(255,255,255,0.03)' }} />
            ))}
          </div>
        ) : publishedUpdates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Megaphone className="w-16 h-16 mb-4 opacity-10" />
            <p className="text-white/30 text-lg font-semibold">Aucune mise à jour publiée</p>
            {canManage ? (
              <p className="text-white/20 text-sm mt-1">Créez votre première mise à jour ci-dessus</p>
            ) : (
              <p className="text-white/20 text-sm mt-1 max-w-sm">
                Les annonces officielles Z&D Thermoliner apparaîtront ici.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {publishedUpdates.length > 0 && (
              <p className="text-xs font-bold uppercase tracking-wider text-white/25 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500/50" />
                Publiées ({publishedUpdates.length})
              </p>
            )}
            {publishedUpdates.map((u, idx) => {
              const cfg = TYPE_CONFIG[u.update_type];
              const TypeIcon = cfg.icon;
              const isExpanded = expandedId === u.id;
              const isLatest = idx === 0;

              return (
                <div key={u.id}
                  className={`rounded-2xl overflow-hidden transition-all ${!u.is_read && 'ring-1 ring-red-500/20'}`}
                  style={{
                    background: isLatest
                      ? 'linear-gradient(135deg, rgba(22,22,22,0.98), rgba(13,13,13,0.98))'
                      : 'rgba(255,255,255,0.02)',
                    border: isLatest ? '1px solid rgba(229,9,20,0.2)' : '1px solid rgba(255,255,255,0.06)',
                  }}>

                  {/* Latest badge */}
                  {isLatest && (
                    <div className="px-5 pt-3 pb-0">
                      <span className="text-[10px] font-black uppercase tracking-widest text-red-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        Dernière mise à jour
                      </span>
                    </div>
                  )}

                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        <TypeIcon className={`w-5 h-5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-sm font-black text-white/30 font-mono tracking-wider">{u.version}</span>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg border"
                            style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.color.includes('text-') ? cfg.color.split('-').slice(1).join('-') : cfg.color }}>
                            <span className={cfg.color}>{cfg.label}</span>
                          </span>
                          {!u.is_read && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg text-red-400"
                              style={{ background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.2)' }}>
                              Non lu
                            </span>
                          )}
                          {readCounts[u.id] != null && readCounts[u.id] > 0 && (
                            <span className="text-[10px] text-white/30">{readCounts[u.id]} lecture{readCounts[u.id] > 1 ? 's' : ''}</span>
                          )}
                          {u.is_read && (
                            <span className="text-[10px] text-emerald-500/60 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />Lu
                            </span>
                          )}
                        </div>
                        <h3 className="text-white font-bold text-base leading-tight">{u.title}</h3>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-white/30">
                            <Calendar className="w-3 h-3" />
                            {u.published_at ? formatDate(u.published_at) : formatDate(u.created_at)}
                          </span>
                          {canManage && (
                            <span className="flex items-center gap-1 text-xs text-white/30">
                              <Users className="w-3 h-3" />
                              Lu par {u.read_count} membre{(u.read_count || 0) > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {canManage && (
                          <>
                            <button onClick={() => startEdit(u)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-white/10"
                              style={{ color: 'rgba(255,255,255,0.35)' }}>
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => unpublishUpdate(u.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-white/10"
                              style={{ color: 'rgba(255,255,255,0.35)' }}
                              title="Repasser en brouillon">
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteUpdate(u.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-red-500/10"
                              style={{ color: 'rgba(239,68,68,0.4)' }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button onClick={() => setExpandedId(isExpanded ? null : u.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-white/10"
                          style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="text-sm text-white/60 leading-relaxed whitespace-pre-line">
                          {u.description}
                        </div>
                        {!u.is_read && (
                          <button onClick={() => markRead(u.id)}
                            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}>
                            <CheckCircle className="w-4 h-4" />
                            Marquer comme lu
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
