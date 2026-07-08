import { useMemo, useState } from 'react';
import { Shield, Search, Lock, Crown, AlertTriangle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { UserManagementTable } from '../components/admin/UserManagementTable';
import { PermissionEditor } from '../components/admin/PermissionEditor';
import { SalonsManagementPanel } from '../components/admin/SalonsManagementPanel';
import { SecurityTimeline } from '../components/admin/SecurityTimeline';
import { useAuth } from '../contexts/AuthContext';
import { canAccessAdministration } from '../lib/adminPermissions';
import { ADMIN_EMAIL } from '../lib/admin';
import { computeAdminDashboard, ERP_ROLE_LABELS, type AdminUser } from '../lib/adminTypes';
import { filterAssignableRoles } from '../lib/dom76Protection';
import {
  useAdminModule,
  useChangeUserRole,
  useDeleteUserProfile,
  useReactivateUser,
  useResetUserTheme,
  useSuspendUser,
  useUpsertPermission,
  useUserActivity,
  useUserPermissions,
} from '../hooks/useAdminSecurity';
import { fetchSecurityLogs } from '../services/securityLogService';
import { useQuery } from '@tanstack/react-query';

type TabId = 'dashboard' | 'users' | 'security' | 'salons';

const ASSIGNABLE_ROLES = ['visitor', 'candidat', 'chauffeur', 'tractionnaire', 'dispatcher', 'directeur', 'patron', 'admin'];

export function AdminSecurityPage() {
  const { profile, user } = useAuth();
  const canManage = canAccessAdministration(profile?.role, user?.email ?? profile?.email);

  const [tab, setTab] = useState<TabId>('dashboard');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [permUser, setPermUser] = useState<AdminUser | null>(null);
  const [roleUser, setRoleUser] = useState<AdminUser | null>(null);
  const [activityUser, setActivityUser] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState('chauffeur');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useAdminModule();
  const { data: permData } = useUserPermissions(permUser?.id);
  const { data: activityData } = useUserActivity(activityUser?.id);
  const { data: securityLogs = [] } = useQuery({
    queryKey: ['admin', 'securityLogs'],
    queryFn: () => fetchSecurityLogs(40),
    enabled: canManage,
  });

  const changeRoleMutation = useChangeUserRole();
  const suspendMutation = useSuspendUser();
  const reactivateMutation = useReactivateUser();
  const resetThemeMutation = useResetUserTheme();
  const deleteMutation = useDeleteUserProfile();
  const permMutation = useUpsertPermission();

  const stats = useMemo(
    () => computeAdminDashboard(
      data?.users ?? [],
      data?.pendingApplications ?? 0,
      data?.pendingRoadSheets ?? 0,
      data?.securityAlerts ?? 0,
      data?.adminActions?.length ?? 0,
    ),
    [data],
  );

  const filteredUsers = useMemo(() => {
    let list = (data?.users ?? []).filter(u => !['ancien_membre', 'banni'].includes(u.role));
    if (roleFilter !== 'all') list = list.filter(u => u.role === roleFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(u =>
      [u.email, u.pseudo, u.full_name, u.role].some(v => v?.toLowerCase().includes(q)),
    );
  }, [data?.users, search, roleFilter]);

  if (!canManage) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Lock className="w-16 h-16 opacity-10 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Accès refusé</h1>
          <p className="text-white/30">Centre de contrôle réservé aux administrateurs.</p>
        </div>
      </Layout>
    );
  }

  async function handleRoleChange() {
    if (!roleUser) return;
    try {
      await changeRoleMutation.mutateAsync({ userId: roleUser.id, role: selectedRole, email: roleUser.email });
      setSuccessMessage(`Rôle mis à jour → ${ERP_ROLE_LABELS[selectedRole] ?? selectedRole}`);
      setRoleUser(null);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Erreur changement de rôle.');
    }
  }

  return (
    <Layout>
      <div className="space-y-6 admin-module">
        <PageHeader
          title="Administration & Sécurité"
          subtitle={`Centre de contrôle DOM76 — ${ADMIN_EMAIL}`}
          icon={Shield}
          actions={
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl admin-control-badge text-xs font-bold text-yellow-400">
              <Crown className="w-4 h-4" />
              Propriétaire protégé
            </div>
          }
        />

        {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}
        {successMessage && <FormSuccess message={successMessage} onDismiss={() => setSuccessMessage(null)} />}
        {data?.migrationRequired && (
          <div className="admin-glass rounded-xl p-4 flex items-start gap-3 border border-amber-500/25">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-200">Tables Admin non installées</p>
              <p className="text-xs text-white/45 mt-1">
                Appliquez la migration Supabase : <code className="text-amber-300">npx supabase db push</code>
                {' '}(migration 031 — admin_security)
              </p>
            </div>
          </div>
        )}
        {isError && (
          <FormAlert
            message={
              (error as { message?: string })?.message
              ?? (error instanceof Error ? error.message : 'Erreur de chargement.')
            }
          />
        )}

        <nav className="flex gap-1 flex-wrap">
          {([
            { id: 'dashboard' as TabId, label: 'Tableau de bord' },
            { id: 'users' as TabId, label: `Utilisateurs (${filteredUsers.length})` },
            { id: 'salons' as TabId, label: 'Gestion des salons' },
            { id: 'security' as TabId, label: 'Sécurité' },
          ]).map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold ${tab === t.id ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'text-white/35 hover:bg-white/5'}`}>
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'dashboard' && (
          <div className="space-y-4">
            <AdminDashboard stats={stats} loading={isLoading} />
            <SecurityTimeline
              securityLogs={securityLogs}
              adminActions={data?.adminActions ?? []}
              loading={isLoading}
            />
          </div>
        )}

        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Email, pseudo, rôle..."
                  className="erp-input pl-9 w-full" />
              </div>
              <select className="erp-select text-sm" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="all">Tous les rôles</option>
                {ASSIGNABLE_ROLES.map(r => (
                  <option key={r} value={r}>{ERP_ROLE_LABELS[r] ?? r}</option>
                ))}
              </select>
            </div>
            <UserManagementTable
              users={filteredUsers}
              currentUserId={user?.id}
              loading={isLoading}
              onChangeRole={u => { setRoleUser(u); setSelectedRole(u.role); }}
              onSuspend={async u => {
                if (!confirm(`Suspendre ${u.email} ?`)) return;
                try {
                  await suspendMutation.mutateAsync({ userId: u.id, email: u.email });
                  setSuccessMessage('Compte suspendu.');
                } catch (err) {
                  setPageError(err instanceof Error ? err.message : 'Erreur suspension.');
                }
              }}
              onReactivate={async u => {
                try {
                  await reactivateMutation.mutateAsync(u.id);
                  setSuccessMessage('Compte réactivé.');
                } catch (err) {
                  setPageError(err instanceof Error ? err.message : 'Erreur réactivation.');
                }
              }}
              onDelete={async u => {
                if (!confirm(`Archiver le profil de ${u.email} ?`)) return;
                try {
                  await deleteMutation.mutateAsync({ userId: u.id, email: u.email });
                  setSuccessMessage('Profil archivé.');
                } catch (err) {
                  setPageError(err instanceof Error ? err.message : 'Erreur archivage.');
                }
              }}
              onResetTheme={async u => {
                try {
                  await resetThemeMutation.mutateAsync({ userId: u.id, email: u.email });
                  setSuccessMessage('Thème réinitialisé.');
                } catch (err) {
                  setPageError(err instanceof Error ? err.message : 'Erreur reset thème.');
                }
              }}
              onPermissions={setPermUser}
              onActivity={setActivityUser}
            />
          </div>
        )}

        {tab === 'salons' && <SalonsManagementPanel />}

        {tab === 'security' && (
          <div className="grid lg:grid-cols-2 gap-4">
            <SecurityTimeline securityLogs={securityLogs} adminActions={data?.adminActions ?? []} loading={isLoading} />
            <div className="admin-glass rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-3">Tentatives refusées récentes</h3>
              <ul className="space-y-2 max-h-80 overflow-y-auto">
                {(data?.failedAttempts ?? []).map((a: { id: string; email?: string; page?: string; reason?: string; created_at: string }) => (
                  <li key={a.id} className="text-xs py-2 border-b border-white/5 text-white/50">
                    <span className="text-red-400">{a.email ?? 'Anonyme'}</span> → {a.page}
                    <span className="block text-white/25">{new Date(a.created_at).toLocaleString('fr-FR')}</span>
                  </li>
                ))}
                {(data?.failedAttempts ?? []).length === 0 && (
                  <p className="text-white/30 text-sm">Aucune tentative récente.</p>
                )}
              </ul>
            </div>
          </div>
        )}

        {permUser && (
          <PermissionEditor
            user={permUser}
            overrides={permData ?? []}
            saving={permMutation.isPending}
            onClose={() => setPermUser(null)}
            onToggle={async (key, granted) => {
              try {
                await permMutation.mutateAsync({
                  userId: permUser.id,
                  key,
                  granted,
                  grantedBy: user!.id,
                  email: permUser.email,
                });
                setSuccessMessage('Permission mise à jour.');
              } catch (err) {
                setPageError(err instanceof Error ? err.message : 'Erreur permission.');
              }
            }}
          />
        )}

        {roleUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="admin-glass rounded-2xl w-full max-w-sm p-5 border border-white/10 space-y-4">
              <h2 className="font-bold text-white">Changer le rôle</h2>
              <p className="text-xs text-white/40">{roleUser.email}</p>
              <select className="erp-select w-full" value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
                {filterAssignableRoles(ASSIGNABLE_ROLES, roleUser.email).map(r => (
                  <option key={r} value={r}>{ERP_ROLE_LABELS[r] ?? r}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button type="button" onClick={() => setRoleUser(null)} className="flex-1 py-2.5 bg-white/5 rounded-xl text-white/50 text-sm">Annuler</button>
                <button type="button" disabled={changeRoleMutation.isPending} onClick={handleRoleChange}
                  className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                  {changeRoleMutation.isPending ? '…' : 'Appliquer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activityUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="admin-glass rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-5 border border-white/10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="font-bold text-white">Activité utilisateur</h2>
                  <p className="text-xs text-white/40">{activityUser.email}</p>
                </div>
                <button type="button" onClick={() => setActivityUser(null)} className="text-white/40 text-sm">Fermer</button>
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white/50 uppercase">Logs sécurité</h3>
                {(activityData?.securityLogs ?? []).map((l: { id: string; event_type: string; message?: string; created_at: string }) => (
                  <div key={l.id} className="text-xs py-2 border-b border-white/5 text-white/60">
                    <span className="text-white/80">{l.event_type}</span> — {l.message}
                    <span className="block text-white/25">{new Date(l.created_at).toLocaleString('fr-FR')}</span>
                  </div>
                ))}
                {(activityData?.securityLogs ?? []).length === 0 && <p className="text-white/30 text-sm">Aucune activité.</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
