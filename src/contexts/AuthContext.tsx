import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { X, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAdministratorEmail } from '../lib/admin';
import { fetchUserProfile, type NormalizedProfile } from '../services/profileService';
import { touchProfileLastSeen } from '../services/profileStatsService';
import { logSecurityEvent } from '../services/securityLogService';
import {
  type AppRole,
  normalizeRole,
  getRoleLabel,
  dispatchRoleUpdated,
} from '../lib/roleEngine';
import { queryKeys } from '../lib/queryKeys';

export type UserProfile = NormalizedProfile;

const ROLE_POLL_INTERVAL_MS = 3000;

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  profileError: string | null;
  profileCustomizationAvailable: boolean;
  isAdministrator: boolean;
  normalizedRole: AppRole;
  role: string | null;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function syncRoleState(
  rawRole: string | null | undefined,
  setRole: (r: string | null) => void,
  setNormalizedRole: (r: AppRole) => void,
): void {
  const nextRole = rawRole ?? null;
  setRole(nextRole);
  setNormalizedRole(normalizeRole(nextRole));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileCustomizationAvailable, setProfileCustomizationAvailable] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [normalizedRole, setNormalizedRole] = useState<AppRole>('visitor');
  const [roleToast, setRoleToast] = useState<{ message: string; label?: string } | null>(null);
  const profileRoleRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollInFlightRef = useRef(false);

  const invalidateRoleQueries = useCallback((userId: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.userRole(userId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(userId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.wall.module(userId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(userId) });
  }, [queryClient]);

  const applyFetchedProfile = useCallback((next: UserProfile | null) => {
    setProfile(next);
    syncRoleState(next?.role, setRole, setNormalizedRole);
    profileRoleRef.current = next?.role ?? null;
  }, []);

  const applyRoleChange = useCallback((newProfile: UserProfile, prevRole: string | null) => {
    const nextRole = newProfile.role;
    console.log(`[Z&D Role Polling] role changed from ${prevRole} to ${nextRole}`);

    setProfile(newProfile);
    setRole(nextRole);
    setNormalizedRole(normalizeRole(nextRole));
    profileRoleRef.current = nextRole;

    dispatchRoleUpdated(newProfile as unknown as Record<string, unknown>);
    invalidateRoleQueries(newProfile.id);

    setRoleToast({
      message: 'Votre rôle a été mis à jour.',
      label: getRoleLabel(nextRole),
    });
    setTimeout(() => setRoleToast(null), 8000);
  }, [invalidateRoleQueries]);

  const clearRolePolling = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollProfileRole = useCallback(async (userId: string) => {
    if (pollInFlightRef.current) return;
    pollInFlightRef.current = true;

    try {
      console.log('[Z&D Role Polling] checking profile');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[Z&D Role Polling] fetch error:', error.message);
        return;
      }

      if (!data) return;

      const newProfile = data as UserProfile;
      const currentRole = profileRoleRef.current;
      const nextRole = newProfile.role;

      if (nextRole !== currentRole) {
        applyRoleChange(newProfile, currentRole);
      }
    } finally {
      pollInFlightRef.current = false;
    }
  }, [applyRoleChange]);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const result = await fetchUserProfile(userId);
      setProfileCustomizationAvailable(result.customizationAvailable);

      if (result.error) {
        setProfileError(result.error);
        applyFetchedProfile(result.profile);
        console.error('[Z&D] fetchProfile error:', result.error, { userId });
      } else {
        setProfileError(null);
        applyFetchedProfile(result.profile);
        void touchProfileLastSeen(userId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement du profil.';
      console.error('[Z&D] fetchProfile exception:', err, { userId });
      setProfileError(message);
      applyFetchedProfile(null);
    } finally {
      setLoading(false);
    }
  }, [applyFetchedProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        void fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch(err => {
      console.error('[Z&D] getSession failed:', err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        if (event === 'SIGNED_IN') {
          void logSecurityEvent({
            eventType: 'login',
            userId: session.user.id,
            message: 'Connexion réussie',
          });
        }
        setTimeout(() => { void fetchProfile(session.user.id); }, 0);
      } else {
        if (event === 'SIGNED_OUT') {
          void logSecurityEvent({
            eventType: 'logout',
            message: 'Déconnexion',
          });
        }
        clearRolePolling();
        setProfile(null);
        setRole(null);
        setNormalizedRole('visitor');
        profileRoleRef.current = null;
        setProfileError(null);
        setProfileCustomizationAvailable(true);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, clearRolePolling]);

  useEffect(() => {
    if (!user?.id || loading) {
      clearRolePolling();
      return;
    }

    clearRolePolling();

    void pollProfileRole(user.id);

    pollIntervalRef.current = setInterval(() => {
      void pollProfileRole(user.id);
    }, ROLE_POLL_INTERVAL_MS);

    return () => {
      clearRolePolling();
    };
  }, [user?.id, loading, pollProfileRole, clearRolePolling]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error };
  }

  async function signOut() {
    clearRolePolling();
    if (user?.id) {
      await logSecurityEvent({
        eventType: 'logout',
        userId: user.id,
        message: 'Déconnexion manuelle',
      });
    }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole(null);
    setNormalizedRole('visitor');
    profileRoleRef.current = null;
    setProfileError(null);
    setSession(null);
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    if (!user) return { error: new Error('Non connecté') };
    const { role: _role, id: _id, email: _email, created_at: _ca, ...safeUpdates } = updates;
    const { error } = await supabase
      .from('profiles')
      .update({ ...safeUpdates, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      console.error('[Z&D] updateProfile failed:', {
        userId: user.id,
        message: error.message,
        code: error.code,
      });
    } else {
      await fetchProfile(user.id);
    }
    return { error };
  }

  async function refreshProfile() {
    if (!user) return;
    setProfileError(null);
    await fetchProfile(user.id);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        profileError,
        profileCustomizationAvailable,
        isAdministrator: isAdministratorEmail(user?.email),
        normalizedRole,
        role,
        setProfile,
        signIn,
        signUp,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
      {roleToast && (
        <div className="fixed top-20 right-4 z-[70] pointer-events-auto max-w-sm animate-slide-up">
          <div className="erp-card rounded-xl p-3 shadow-2xl border border-amber-500/25 flex gap-2">
            <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">Rôle mis à jour</p>
              <p className="text-[10px] text-white/50 mt-0.5">{roleToast.message}</p>
              {roleToast.label && (
                <p className="text-[10px] text-amber-400/80 mt-1">{roleToast.label}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setRoleToast(null)}
              className="text-white/30 hover:text-white"
              aria-label="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
