import { X, Loader2 } from 'lucide-react';
import { isDom76Protected } from '../../lib/dom76Protection';
import { getDefaultPermissionsForRole, resolveUserPermissions } from '../../lib/adminPermissions';
import {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  type AdminUser,
  type PermissionKey,
  type UserPermission,
} from '../../lib/adminTypes';

interface PermissionEditorProps {
  user: AdminUser;
  overrides: UserPermission[];
  saving: boolean;
  onClose: () => void;
  onToggle: (key: PermissionKey, granted: boolean) => void;
}

export function PermissionEditor({ user, overrides, saving, onClose, onToggle }: PermissionEditorProps) {
  const protected_ = isDom76Protected(user.email);
  const perms = resolveUserPermissions(
    user.role,
    overrides.map(o => ({ permission_key: o.permission_key, granted: o.granted })),
    user.email,
  );
  const defaults = getDefaultPermissionsForRole(user.role);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="admin-glass rounded-2xl w-full max-w-md border border-white/10">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white">Permissions</h2>
            <p className="text-xs text-white/40">{user.pseudo || user.email}</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {protected_ && (
            <p className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3">
              Compte DOM76 — toutes les permissions sont verrouillées.
            </p>
          )}
          {PERMISSION_KEYS.map(key => {
            const isDefault = defaults.includes(key);
            const hasOverride = overrides.some(o => o.permission_key === key);
            const granted = perms[key];

            return (
              <label key={key} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                granted ? 'border-red-500/20 bg-red-500/5' : 'border-white/5 bg-white/[0.02]'
              } ${protected_ ? 'opacity-60 pointer-events-none' : 'cursor-pointer hover:border-white/10'}`}>
                <div>
                  <p className="text-sm text-white/80 font-medium">{PERMISSION_LABELS[key]}</p>
                  <p className="text-[10px] text-white/30">
                    {hasOverride ? 'Override personnalisé' : isDefault ? 'Par défaut (rôle)' : 'Non accordé'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {saving && <Loader2 className="w-3 h-3 animate-spin text-white/30" />}
                  <input
                    type="checkbox"
                    checked={granted}
                    disabled={protected_ || saving}
                    onChange={e => onToggle(key, e.target.checked)}
                    className="w-4 h-4 accent-red-500"
                  />
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
