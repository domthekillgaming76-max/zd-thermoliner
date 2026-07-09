import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn('[Z&D Server] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for admin API.');
}

export const supabaseAdmin = createClient(url || 'https://placeholder.supabase.co', serviceKey || 'placeholder', {
  auth: { autoRefreshToken: false, persistSession: false },
});

export function isSupabaseAdminReady() {
  return Boolean(url && serviceKey);
}
