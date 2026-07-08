import type { ElementType } from 'react';
import { Shield, Ban, RotateCcw, Trash2, Palette, KeyRound, Activity } from 'lucide-react';
import { isDom76Protected } from '../../lib/dom76Protection';
import { RoleBadge } from '../erp/RoleBadge';
import type { AdminUser } from '../../lib/adminTypes';

interface UserManagementTableProps {
  users: AdminUser[];
  currentUserId?: string;
  loading?: boolean;
  onChangeRole: (user: AdminUser) => void;
  onSuspend: (user: AdminUser) => void;
  onReactivate: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  onResetTheme: (user: AdminUser) => void;
  onPermissions: (user: AdminUser) => void;
  onActivity: (user: AdminUser) => void;
}

export function UserManagementTable({
  users, currentUserId, loading,
  onChangeRole, onSuspend, onReactivate, onDelete, onResetTheme, onPermissions, onActivity,
}: UserManagementTableProps) {
  if (loading) {
    return <div className="admin-glass h-64 shimmer rounded-xl" />;
  }

  if (users.length === 0) {
    return (
      <div className="admin-glass rounded-2xl p-16 text-center">
        <p className="text-white/30">Aucun utilisateur</p>
      </div>
    );
  }

  return (
    <div className="admin-glass rounded-2xl overflow-hidden border border-white/5">
      <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 text-[10px] font-bold uppercase text-white/30 border-b border-white/5">
        <div className="col-span-4">Utilisateur</div>
        <div className="col-span-2">Rôle</div>
        <div className="col-span-2">Statut</div>
        <div className="col-span-4 text-right">Actions</div>
      </div>
      <div className="divide-y divide-white/5">
        {users.map(u => {
          const protected_ = isDom76Protected(u.email);
          const isSelf = u.id === currentUserId;
          const suspended = u.is_suspended || !u.is_active;

          return (
            <div key={u.id} className="px-4 py-3 grid md:grid-cols-12 gap-2 items-center hover:bg-white/[0.02]">
              <div className="col-span-4 flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {(u.pseudo || u.full_name || u.email)[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate flex items-center gap-1">
                    {u.pseudo || u.full_name || 'Sans nom'}
                    {protected_ && <Shield className="w-3 h-3 text-yellow-400 shrink-0" aria-label="DOM76 protégé" />}
                  </p>
                  <p className="text-xs text-white/35 truncate">{u.email}</p>
                </div>
              </div>
              <div className="col-span-2">
                <RoleBadge role={u.role} size="xs" />
              </div>
              <div className="col-span-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  suspended ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {suspended ? 'Suspendu' : 'Actif'}
                </span>
              </div>
              <div className="col-span-4 flex justify-end gap-1 flex-wrap">
                {!isSelf && !protected_ && (
                  <>
                    <ActionBtn icon={KeyRound} title="Rôle" onClick={() => onChangeRole(u)} />
                    {!suspended ? (
                      <ActionBtn icon={Ban} title="Suspendre" onClick={() => onSuspend(u)} danger />
                    ) : (
                      <ActionBtn icon={RotateCcw} title="Réactiver" onClick={() => onReactivate(u)} success />
                    )}
                    <ActionBtn icon={Palette} title="Reset thème" onClick={() => onResetTheme(u)} />
                    <ActionBtn icon={Shield} title="Permissions" onClick={() => onPermissions(u)} />
                    <ActionBtn icon={Trash2} title="Archiver" onClick={() => onDelete(u)} danger />
                  </>
                )}
                <ActionBtn icon={Activity} title="Activité" onClick={() => onActivity(u)} />
                {protected_ && <span className="text-[10px] text-yellow-400/70 px-2">DOM76</span>}
                {isSelf && <span className="text-[10px] text-white/25 px-2">Vous</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, title, onClick, danger, success }: {
  icon: ElementType; title: string; onClick: () => void; danger?: boolean; success?: boolean;
}) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
        danger ? 'hover:bg-red-500/10 text-red-400/70' :
        success ? 'hover:bg-emerald-500/10 text-emerald-400/70' :
        'hover:bg-white/10 text-white/40'
      }`}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
