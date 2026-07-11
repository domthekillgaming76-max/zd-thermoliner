import { supabase } from './supabase';

export async function getFreshAccessToken(): Promise<string> {
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  const token =
    refreshed.session?.access_token
    ?? (await supabase.auth.getSession()).data.session?.access_token;

  if (!token) {
    if (refreshError) {
      throw new Error(`Session expirée — reconnectez-vous. (${refreshError.message})`);
    }
    throw new Error('Session expirée — déconnectez-vous, reconnectez-vous, puis réessayez.');
  }
  return token;
}

export function getSupabasePublicConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  if (!url || !anonKey) {
    throw new Error('Configuration Supabase manquante (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  }
  return { url, anonKey };
}

export async function invokeAuthenticatedRpc<T = unknown>(
  functionName: string,
  params: Record<string, unknown>,
): Promise<T> {
  const token = await getFreshAccessToken();
  const { url, anonKey } = getSupabasePublicConfig();

  const res = await fetch(`${url}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  const body = await res.json().catch(() => ({})) as { message?: string; code?: string };

  if (!res.ok) {
    const msg = body.message ?? `Erreur Supabase (${res.status})`;
    if (msg.includes('Non authentifié')) {
      throw new Error('Session invalide — déconnectez-vous, reconnectez-vous, puis réessayez.');
    }
    throw new Error(msg);
  }

  return body as T;
}
