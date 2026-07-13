import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { UserBadges } from '../erp/UserBadges';
import type { UserProfile } from '../../contexts/AuthContext';
import type { User } from '@supabase/supabase-js';

interface SidebarUserProfileProps {
  profile: UserProfile | null;
  user: User | null;
  role: string | null;
  isAdministrator: boolean;
  collapsed: boolean;
}

function getRoleLabel(role: string | null): string {
  const labels: Record<string, string> = {
    'pdg': 'PDG',
    'manager': 'Manager',
    'dispatcher': 'Dispatcher',
    'driver': 'Chauffeur',
    'owner': 'Propriétaire',
    'visitor': 'Visiteur',
  };
  return labels[(role?.toLowerCase() ?? '')] ?? role ?? 'Membre';
}

export function SidebarUserProfile({
  profile,
  user,
  role,
  isAdministrator,
  collapsed,
}: SidebarUserProfileProps) {
  if (!profile || !user) return null;

  const displayName = profile.pseudo || profile.full_name || 'Membre';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || '?';

  const avatarSrc = profile.avatar_url || profile.truck_photo_url;

  if (collapsed) {
    return (
      <Link
        to={`/profile/${user.id}`}
        title={displayName}
        className="flex items-center justify-center w-12 h-12 rounded-xl hover:bg-white/5 transition-colors relative group"
      >
        <div className="relative w-10 h-10">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={displayName}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-full rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border border-black" />
        </div>
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
          <div className="bg-gray-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white whitespace-nowrap">
            {displayName}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/profile/${user.id}`}
      className="group block p-3 rounded-xl hover:bg-white/[0.03] transition-colors border border-transparent hover:border-red-500/20 mb-4"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative w-12 h-12 flex-shrink-0">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={displayName}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-full rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
              <span className="text-sm font-bold text-white">{initials}</span>
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-gray-900 shadow-lg" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate group-hover:text-red-400 transition-colors">
            {displayName}
          </p>
          <p className="text-xs text-white/40 truncate">@{profile.pseudo || 'membre'}</p>

          {/* Badges et XP */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5">
              {isAdministrator ? (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-yellow-500/15 text-yellow-300 border border-yellow-500/25">
                  <Shield className="w-3 h-3" />
                  Administrateur
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/25">
                  {getRoleLabel(role)}
                </div>
              )}
            </div>
          </div>

          {/* User Badges */}
          {role && (
            <div className="mt-2">
              <UserBadges
                isAdministrator={isAdministrator}
                role={role}
                email={user.email ?? ''}
                size="xs"
              />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
