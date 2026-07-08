import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { X, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAdministratorEmail } from '../lib/admin';
import { fetchUserProfile, type NormalizedProfile } from '../services/profileService';
import { touchProfileLastSeen } from '../services/profileStatsService';
import { logSecurityEvent } from '../services/securityLogService';
import { logRoleState, normalizeRole, getRoleLabel } from '../lib/roles';
import { queryKeys } from '../lib/queryKeys';

export type UserProfile = NormalizedProfile;

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  profileError: string | null;
  profileCustomizationAvailable: boolean;
  isAdministrator: boolean;
  normalizedRole: ReturnType<typeof normalizeRole>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileCustomizationAvailable, setProfileCustomizationAvailable] = useState(true);
  const [roleToast, setRoleToast] = useState<string | null>(null);
  const profileRoleRef = useRef<string | undefined>(profile?.role);

  useEffect(() => {
    profileRoleRef.current = profile?.role;
  }, [profile?.role]);

  const invalidateRoleQueries = useCallback((userId: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.userRole(userId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(userId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.wall.module(userId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
  }, [queryClient]);

  const fetchProfile = useCallback(async (userId: string, options?: { fromRealtime?: boolean }) => {
    try {
      const result = await fetchUserProfile(userId);
      setProfileCustomizationAvailable(result.customizationAvailable);

      if (result.error) {
        setProfileError(result.error);
        setProfile(result.profile);
        console.error('[Z&D] fetchProfile error:', result.error, { userId });
      } else {
        setProfileError(null);
        setProfile(result.profile);
        logRoleState(result.profile?.role ?? null, 'current role');
        void touchProfileLastSeen(userId);
      }

      if (options?.fromRealtime) {
        invalidateRoleQueries(userId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement du profil.';
      console.error('[Z&D] fetchProfile exception:', err, { userId });
      setProfileError(message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [invalidateRoleQueries]);

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
        setProfile(null);
        setProfileError(null);
        setProfileCustomizationAvailable(true);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile_role_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        payload => {
          const updated = payload.new as Partial<UserProfile>;
          const prevRole = profileRoleRef.current;
          const nextRole = updated.role ?? prevRole;

          console.log('[Z&D Role] realtime role updated:', nextRole);

          setProfile(prev => (prev ? { ...prev, ...updated } : prev));

          if (nextRole && nextRole !== prevRole) {
            logRoleState(nextRole, 'realtime role updated');
            setRoleToast(
              `Votre rôle a été mis à jour : ${getRoleLabel(nextRole)}.`,
            );
            void fetchProfile(user.id, { fromRealtime: true });
            setTimeout(() => setRoleToast(null), 8000);
          } else if (updated.role === undefined) {
            void fetchProfile(user.id, { fromRealtime: true });
          }
        },
      )
      .subscribe();

    return () => { void channel.unsubscribe(); };
  }, [user?.id, fetchProfile]);

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

  const normalizedRole = normalizeRole(profile?.role);

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
              <p className="text-[10px] text-white/50 mt-0.5">{roleToast}</p>
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
