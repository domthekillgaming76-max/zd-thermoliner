import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

/** Client Supabase anon — utilisé uniquement pour signInWithPassword (jamais exposé au renderer). */
export function getSupabaseAuth() {
  return createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function isSupabaseAuthReady() {
  return Boolean(url && anonKey);
}
