import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Shield, Search, Edit, UserX, Ban,
  UserMinus, RotateCcw, AlertTriangle, X, ChevronDown, ChevronUp, ArrowUpCircle,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { FormSuccess } from '../components/erp/FormAlert';
import { RoleBadge } from '../components/erp/RoleBadge';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import { promoteMemberRole, describePromotion } from '../services/rolePromotionService';
import { changeUserRole } from '../services/adminService';
import { isDriverProfileRole } from '../services/driverSyncService';
import { getRoleLabel } from '../lib/roles';
import { assertCanAssignRole, filterAssignableRoles, isDom76Protected } from '../lib/dom76Protection';
import { queryKeys } from '../lib/queryKeys';

type UserRole = 'pdg' | 'patron' | 'directeur' | 'dispatcher' | 'chauffeur' | 'tractionnaire' | 'candidat' | 'visitor' | 'ancien_membre' | 'banni';

type AuditLog = {
  id: string;
  target_user_id: string;
  action_by_user_id: string;
  action_type: string;
  reason: string | null;
  old_role: string | null;
  new_role: string | null;
  created_at: string;
  target?: { pseudo: string | null; full_name: string | null; email: string };
  actor?: { pseudo: string | null; full_name: string | null; email: string };
};

type Tab = 'membres' | 'archives' | 'historique';

type ModalType = 'role' | 'fire' | 'ban' | 'restore' | null;

const ACTION_ICONS: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  left_company:         { icon: UserMinus, color: 'text-white/40', label: 'Départ volontaire' },
  fired:                { icon: UserX, color: 'text-orange-400', label: 'Licencié' },
  banned:               { icon: Ban, color: 'text-red-400', label: 'Banni' },
  removed_from_drivers: { icon: UserMinus, color: 'text-amber-400', label: 'Retiré du salon' },
  restored:             { icon: RotateCcw, color: 'text-emerald-400', label: 'Restauré' },
};

function UserAvatar({ u, size = 9 }: { u: Profile; size?: number }) {
  const initials = (u.pseudo || u.full_name || u.email || '?')[0].toUpperCase();
  return (
    <div className={`w-${size} h-${size} rounded-full overflow-hidden flex items-center justify-center font-bold text-sm text-white flex-shrink-0`}
      style={{ background: 'linear-gradient(135deg, #b91c1c, #7f1d1d)' }}>
      {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : initials}
    </div>
  );
}

export function AdminPage() {
  const queryClient = useQueryClient();
  const { profile, user, refreshProfile } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [archived, setArchived] = useState<Profile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('membres');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [targetUser, setTargetUser] = useState<Profile | null>(null);
  const [modalReason, setModalReason] = useState('');
  const [modalRestoreRole, setModalRestoreRole] = useState<'chauffeur' | 'tractionnaire'>('chauffeur');
  const [modalRoleSelect, setModalRoleSelect] = useState<UserRole>('chauffeur');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [promoteLoadingId, setPromoteLoadingId] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isPDG = profile?.role === 'pdg';
  const canManage = profile?.role === 'pdg' || profile?.role === 'patron';

  const load = useCallback(async () => {
    setLoading(true);
    const [membersRes, archivedRes, logsRes] = await Promise.all([
      supabase.from('profiles').select('*').not('role', 'in', '(ancien_membre,banni,candidat)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').in('role', ['ancien_membre', 'banni']).order('created_at', { ascending: false }),
      supabase.from('members_audit_logs').select('*, target:target_user_id(pseudo, full_name, email), actor:action_by_user_id(pseudo, full_name, email)').order('created_at', { ascending: false }).limit(50),
    ]);
    if (membersRes.data) setMembers(membersRes.data as Profile[]);
    if (archivedRes.data) setArchived(archivedRes.data as Profile[]);
    if (logsRes.data) setAuditLogs(logsRes.data as unknown as AuditLog[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!canManage) return;
    load();
    const channel = supabase
      .channel('admin_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members_audit_logs' }, () => load())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [canManage, load]);

  function openModal(type: ModalType, u: Profile) {
    setTargetUser(u);
    setModalType(type);
    setModalReason('');
    setModalRestoreRole('chauffeur');
    setModalRoleSelect(u.role as UserRole);
    setActionError(null);
  }

  async function handlePromote(u: Profile) {
    setPromoteLoadingId(u.id);
    setActionError(null);
    try {
      const newRole = await promoteMemberRole(u.id);
      console.log('[Z&D] Promoted', u.email, '→', newRole, getRoleLabel(newRole));
      setSuccessMessage(`Rôle mis à jour → ${getRoleLabel(newRole)}`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Promotion impossible');
    } finally {
      setPromoteLoadingId(null);
    }
  }

  async function executeAction() {
    if (!targetUser) return;
    if ((modalType === 'fire' || modalType === 'ban') && !modalReason.trim()) {
      setActionError('Un motif est obligatoire.');
      return;
    }
    setActionLoading(true);
    setActionError(null);

    let error: { message: string } | null = null;

    if (modalType === 'role') {
      try {
        assertCanAssignRole(targetUser.email, modalRoleSelect);
        const result = await changeUserRole(targetUser.id, modalRoleSelect, targetUser.email);
        setMembers(prev => prev.map(m => m.id === targetUser.id ? { ...m, role: modalRoleSelect } : m));
        void queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
        if (result.driverEnsured) {
          setSuccessMessage('Chauffeur ajouté à la société');
        }
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Changement de rôle impossible');
        setActionLoading(false);
        return;
      }
    } else if (modalType === 'fire') {
      const res = await supabase.rpc('fire_member', { target_user_id: targetUser.id, reason: modalReason });
      error = res.error;
    } else if (modalType === 'ban') {
      const res = await supabase.rpc('ban_member', { target_user_id: targetUser.id, reason: modalReason });
      error = res.error;
    } else if (modalType === 'restore') {
      const res = await supabase.rpc('restore_member', { target_user_id: targetUser.id, restore_role: modalRestoreRole });
      error = res.error;
    }

    if (error) { setActionError(error.message); setActionLoading(false); return; }
    if (modalType === 'role') {
      if (!isDriverProfileRole(modalRoleSelect)) {
        setSuccessMessage(`Rôle mis à jour → ${getRoleLabel(modalRoleSelect)}`);
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
      if (targetUser.id === user?.id) {
        void refreshProfile();
      }
    }
    setModalType(null);
    setTargetUser(null);
    setActionLoading(false);
    await load();
  }

  if (!canManage) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Shield className="w-16 h-16 opacity-10 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Accès refusé</h1>
          <p className="text-white/30">Seuls le PDG et le Patron peuvent accéder à cette page.</p>
        </div>
      </Layout>
    );
  }

  const activeRoles: UserRole[] = isPDG
    ? ['pdg','patron','directeur','dispatcher','chauffeur','tractionnaire','candidat','visitor']
    : ['patron','directeur','dispatcher','chauffeur','tractionnaire','candidat','visitor'];

  const modalAssignableRoles = targetUser
    ? filterAssignableRoles(activeRoles, targetUser.email) as UserRole[]
    : activeRoles;

  const filteredMembers = members.filter(u => {
    const name = (u.pseudo || u.full_name || u.email || '').toLowerCase();
    return name.includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
  });

  const filteredArchived = archived.filter(u => {
    const name = (u.pseudo || u.full_name || u.email || '').toLowerCase();
    return name.includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
  });

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'membres', label: 'Membres actifs', count: members.length },
    { key: 'archives', label: 'Anciens / Bannis', count: archived.length },
    { key: 'historique', label: 'Historique', count: auditLogs.length },
  ];

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(229,9,20,0.12)', border: '1px solid rgba(229,9,20,0.2)' }}>
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Administration</h1>
            <p className="text-xs text-white/30 mt-0.5">Gestion des membres et des rôles</p>
          </div>
        </div>

        {successMessage && <FormSuccess message={successMessage} onDismiss={() => setSuccessMessage(null)} />}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Membres actifs', value: members.length, color: 'text-white' },
            { label: 'Anciens membres', value: archived.filter(u => u.role === 'ancien_membre').length, color: 'text-white/50' },
            { label: 'Bannis', value: archived.filter(u => u.role === 'banni').length, color: 'text-red-400' },
            { label: 'Actions audit', value: auditLogs.length, color: 'text-amber-400' },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs text-white/30 mb-1">{s.label}</p>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.key ? 'text-white' : 'text-white/40 hover:text-white/60'
              }`}
              style={tab === t.key ? {
                background: 'linear-gradient(135deg, rgba(229,9,20,0.2), rgba(229,9,20,0.08))',
                border: '1px solid rgba(229,9,20,0.35)',
              } : {
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
              {t.label}
              <span className="ml-2 text-xs opacity-60">{t.count}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        {tab !== 'historique' && (
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
          </div>
        )}

        {/* MEMBRES ACTIFS */}
        {tab === 'membres' && (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            {loading ? (
              <div className="p-8 text-center text-white/30">Chargement...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-white/20">Aucun membre trouvé</div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                {filteredMembers.map(u => (
                  <div key={u.id} className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                    <UserAvatar u={u} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white truncate">{u.pseudo || u.full_name || 'Sans nom'}</p>
                        <RoleBadge role={u.role} size="xs" />
                        {isDom76Protected(u.email) && <Shield className="w-3 h-3 text-amber-400" aria-label="DOM76 protégé" />}
                      </div>
                      <p className="text-xs text-white/30 truncate">{u.email}</p>
                    </div>

                    {/* Actions */}
                    {u.id !== user?.id && (isPDG || (profile?.role === 'patron' && u.role !== 'pdg')) && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {describePromotion(u.role) && !isDom76Protected(u.email) && (
                          <button
                            onClick={() => handlePromote(u)}
                            disabled={promoteLoadingId === u.id}
                            title={`Promouvoir → ${describePromotion(u.role)}`}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all hover:bg-emerald-500/10 disabled:opacity-50"
                            style={{ color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}
                          >
                            <ArrowUpCircle className="w-3.5 h-3.5" />
                            {promoteLoadingId === u.id ? '…' : describePromotion(u.role)}
                          </button>
                        )}
                        <button onClick={() => openModal('role', u)}
                          title="Changer le rôle"
                          className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-white/10"
                          style={{ color: 'rgba(255,255,255,0.4)' }}>
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openModal('fire', u)}
                          disabled={isDom76Protected(u.email)}
                          title="Licencier"
                          className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-orange-500/10"
                          style={{ color: 'rgba(249,115,22,0.6)' }}>
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                        {isPDG && (
                          <button onClick={() => openModal('ban', u)}
                            disabled={isDom76Protected(u.email)}
                            title="Bannir"
                            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-red-500/10"
                            style={{ color: 'rgba(239,68,68,0.6)' }}>
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                    {u.id === user?.id && (
                      <span className="text-xs text-white/20 flex-shrink-0">Vous</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ARCHIVES */}
        {tab === 'archives' && (
          <div className="space-y-3">
            {filteredArchived.length === 0 ? (
              <div className="py-16 text-center text-white/20">Aucun ancien membre</div>
            ) : (
              filteredArchived.map(u => (
                <div key={u.id} className="rounded-2xl overflow-hidden"
                  style={{
                    background: u.role === 'banni' ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)',
                    border: u.role === 'banni' ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(255,255,255,0.06)',
                  }}>
                  <div className="p-4 flex items-center gap-4">
                    <UserAvatar u={u} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white/70 truncate">{u.pseudo || u.full_name || 'Sans nom'}</p>
                        <RoleBadge role={u.role} size="xs" />
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg font-medium ${
                          u.application_status === 'banned' ? 'bg-red-500/10 text-red-400' :
                          u.application_status === 'fired' ? 'bg-orange-500/10 text-orange-400' :
                          'bg-white/5 text-white/30'
                        }`}>
                          {u.application_status === 'banned' ? 'Banni' : u.application_status === 'fired' ? 'Licencié' : 'Parti'}
                        </span>
                      </div>
                      <p className="text-xs text-white/25 truncate">{u.email}</p>
                    </div>

                    {isPDG && (
                      <button onClick={() => openModal('restore', u)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0"
                        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}>
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restaurer
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* HISTORIQUE */}
        {tab === 'historique' && (
          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <div className="py-16 text-center text-white/20">Aucune action enregistrée</div>
            ) : (
              auditLogs.map(log => {
                const cfg = ACTION_ICONS[log.action_type] || ACTION_ICONS.left_company;
                const targetName = (log.target as any)?.pseudo || (log.target as any)?.full_name || (log.target as any)?.email || log.target_user_id.slice(0, 8);
                const actorName = (log.actor as any)?.pseudo || (log.actor as any)?.full_name || (log.actor as any)?.email || 'Système';
                const isExpanded = expandedLog === log.id;

                return (
                  <div key={log.id} className="rounded-xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <button onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors">
                      <cfg.icon className={`w-4 h-4 flex-shrink-0 ${cfg.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/70 truncate">
                          <span className="font-semibold text-white">{targetName}</span>
                          {' '}<span className="text-white/40">·</span>{' '}
                          <span className={cfg.color}>{cfg.label}</span>
                        </p>
                        <p className="text-xs text-white/25">
                          Par {actorName} · {new Date(log.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-white/20" /> : <ChevronDown className="w-4 h-4 text-white/20" />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 space-y-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        {log.old_role && log.new_role && (
                          <p className="text-xs text-white/40">
                            Rôle: <span className="text-white/60">{getRoleLabel(log.old_role)}</span>
                            {' → '}
                            <span className="text-white/60">{getRoleLabel(log.new_role)}</span>
                          </p>
                        )}
                        {log.reason && (
                          <p className="text-xs text-white/40">
                            Motif: <span className="text-white/60 italic">"{log.reason}"</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {modalType && targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #141414 0%, #0d0d0d 100%)',
              border: modalType === 'ban' ? '1px solid rgba(239,68,68,0.2)' :
                      modalType === 'fire' ? '1px solid rgba(249,115,22,0.2)' :
                      modalType === 'restore' ? '1px solid rgba(16,185,129,0.2)' :
                      '1px solid rgba(255,255,255,0.1)',
            }}>
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <h2 className="font-bold text-white">
                {modalType === 'role' && 'Modifier le rôle'}
                {modalType === 'fire' && 'Licencier ce membre'}
                {modalType === 'ban' && 'Bannir ce membre'}
                {modalType === 'restore' && 'Restaurer ce membre'}
              </h2>
              <button onClick={() => setModalType(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Target info */}
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <UserAvatar u={targetUser} size={10} />
                <div>
                  <p className="font-semibold text-white">{targetUser.pseudo || targetUser.full_name || 'Sans nom'}</p>
                  <p className="text-xs text-white/40">{targetUser.email}</p>
                </div>
              </div>

              {/* Role selector */}
              {modalType === 'role' && (
                <div className="space-y-2">
                  {modalAssignableRoles.map(role => (
                    <button key={role} onClick={() => setModalRoleSelect(role)}
                      className={`w-full px-4 py-3 rounded-xl text-left flex items-center gap-3 transition-all border text-sm font-medium ${
                        modalRoleSelect === role
                          ? 'border-red-500/40 bg-red-500/10 text-white'
                          : 'border-white/6 bg-white/[0.02] text-white/60 hover:bg-white/5'
                      }`}>
                      <RoleBadge role={role} size="xs" showIcon={false} />
                      {getRoleLabel(role)}
                      {targetUser.role === role && <span className="ml-auto text-xs text-red-400/70">Actuel</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* Reason field for fire/ban */}
              {(modalType === 'fire' || modalType === 'ban') && (
                <div>
                  <label className="block text-xs text-white/40 mb-2">Motif obligatoire</label>
                  <textarea value={modalReason} onChange={e => setModalReason(e.target.value)}
                    placeholder={modalType === 'fire' ? 'Motif du licenciement...' : 'Motif du bannissement...'}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white/70 placeholder-white/20 outline-none resize-none"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }} />
                  <p className="text-xs text-white/20 mt-1.5">Ce motif sera visible dans l'historique.</p>
                </div>
              )}

              {/* Restore role selector */}
              {modalType === 'restore' && (
                <div>
                  <label className="block text-xs text-white/40 mb-2">Restaurer comme</label>
                  <div className="flex gap-2">
                    {(['chauffeur', 'tractionnaire'] as const).map(r => (
                      <button key={r} onClick={() => setModalRestoreRole(r)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                          modalRestoreRole === r
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                            : 'border-white/6 bg-white/[0.02] text-white/50 hover:bg-white/5'
                        }`}>
                        {r === 'chauffeur' ? 'Chauffeur' : 'Tractionnaire'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning for fire/ban */}
              {(modalType === 'fire' || modalType === 'ban') && (
                <div className="flex items-start gap-2 p-3 rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400/80">
                    {modalType === 'fire'
                      ? 'Le membre perdra immédiatement accès à tous les salons internes.'
                      : 'Le membre sera complètement bloqué. Seul le PDG peut restaurer un banni.'
                    }
                  </p>
                </div>
              )}

              {actionError && (
                <p className="text-red-400 text-xs px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {actionError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setModalType(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                  Annuler
                </button>
                <button onClick={executeAction} disabled={actionLoading}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
                    modalType === 'ban' ? 'text-red-400' :
                    modalType === 'fire' ? 'text-orange-400' :
                    modalType === 'restore' ? 'text-emerald-400' :
                    'text-white'
                  }`}
                  style={{
                    background: modalType === 'ban' ? 'rgba(239,68,68,0.12)' :
                                modalType === 'fire' ? 'rgba(249,115,22,0.12)' :
                                modalType === 'restore' ? 'rgba(16,185,129,0.12)' :
                                'rgba(229,9,20,0.15)',
                    border: modalType === 'ban' ? '1px solid rgba(239,68,68,0.3)' :
                            modalType === 'fire' ? '1px solid rgba(249,115,22,0.3)' :
                            modalType === 'restore' ? '1px solid rgba(16,185,129,0.3)' :
                            '1px solid rgba(229,9,20,0.3)',
                  }}>
                  {actionLoading ? 'En cours...' :
                   modalType === 'role' ? 'Appliquer' :
                   modalType === 'fire' ? 'Licencier' :
                   modalType === 'ban' ? 'Bannir' :
                   'Restaurer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
