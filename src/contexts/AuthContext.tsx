import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isAdministratorEmail } from '../lib/admin';
import { fetchUserProfile, type NormalizedProfile } from '../services/profileService';
import { touchProfileLastSeen } from '../services/profileStatsService';
import { logSecurityEvent } from '../services/securityLogService';



export type UserProfile = NormalizedProfile;



interface AuthContextType {

  user: User | null;

  profile: UserProfile | null;

  session: Session | null;

  loading: boolean;

  profileError: string | null;

  profileCustomizationAvailable: boolean;

  isAdministrator: boolean;

  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;

  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;

  signOut: () => Promise<void>;

  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;

  refreshProfile: () => Promise<void>;

}



const AuthContext = createContext<AuthContextType | undefined>(undefined);



export function AuthProvider({ children }: { children: ReactNode }) {

  const [user, setUser] = useState<User | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [session, setSession] = useState<Session | null>(null);

  const [loading, setLoading] = useState(true);

  const [profileError, setProfileError] = useState<string | null>(null);

  const [profileCustomizationAvailable, setProfileCustomizationAvailable] = useState(true);



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

  }, []);



  async function fetchProfile(userId: string) {

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
        void touchProfileLastSeen(userId);
      }

    } catch (err) {

      const message = err instanceof Error ? err.message : 'Erreur lors du chargement du profil.';

      console.error('[Z&D] fetchProfile exception:', err, { userId });

      setProfileError(message);

      setProfile(null);

    } finally {

      setLoading(false);

    }

  }



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

        details: error.details,

        hint: error.hint,

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

        signIn,

        signUp,

        signOut,

        updateProfile,

        refreshProfile,

      }}

    >

      {children}

    </AuthContext.Provider>

  );

}



export function useAuth() {

  const ctx = useContext(AuthContext);

  if (!ctx) throw new Error('useAuth must be used within AuthProvider');

  return ctx;

}

