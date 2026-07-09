import { createClient } from '@supabase/supabase-js';

function getAdminConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

let warned = false;
let cachedAdmin = null;

function resolveAdminClient() {
  const { url, serviceKey } = getAdminConfig();
  if (!warned && (!url || !serviceKey)) {
    warned = true;
    console.warn('[Z&D Server] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for admin API.');
  }
  if (!cachedAdmin) {
    cachedAdmin = createClient(url || 'https://placeholder.supabase.co', serviceKey || 'placeholder', {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cachedAdmin;
}

export function getSupabaseAdmin() {
  return resolveAdminClient();
}

export const supabaseAdmin = new Proxy({}, {
  get(_target, prop) {
    const client = resolveAdminClient();
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export function isSupabaseAdminReady() {
  const { url, serviceKey } = getAdminConfig();
  return Boolean(url && serviceKey);
}
