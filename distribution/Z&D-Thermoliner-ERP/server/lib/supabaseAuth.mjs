import { createClient } from '@supabase/supabase-js';

function getAuthConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  };
}

/** Client Supabase anon — utilisé uniquement pour signInWithPassword (jamais exposé au renderer). */
export function getSupabaseAuth() {
  const { url, anonKey } = getAuthConfig();
  return createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function isSupabaseAuthReady() {
  const { url, anonKey } = getAuthConfig();
  return Boolean(url && anonKey);
}
