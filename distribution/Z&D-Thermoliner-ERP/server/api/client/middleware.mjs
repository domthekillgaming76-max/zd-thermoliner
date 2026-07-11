import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin, isSupabaseAdminReady } from '../../lib/supabaseAdmin.mjs';
import { getSupabaseAuth } from '../../lib/supabaseAuth.mjs';

const PROFILE_SELECT = 'id, email, full_name, pseudo, role, is_suspended, is_active';

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
}

function getSupabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
}

async function fetchProfile(userId, accessToken) {
  if (isSupabaseAdminReady()) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  if (!accessToken) return null;

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) return null;

  const userClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data, error } = await userClient
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export async function requireClientAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Token manquant', message: 'Authorization: Bearer <token> requis' });
  }

  let user = null;
  if (isSupabaseAdminReady()) {
    const { data: { user: adminUser }, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && adminUser) user = adminUser;
  }

  if (!user) {
    const authClient = getSupabaseAuth();
    const { data: { user: authUser }, error } = await authClient.auth.getUser(token);
    if (error || !authUser) {
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
    user = authUser;
  }

  req.clientUser = user;
  req.clientToken = token;
  return next();
}

export async function loadClientContext(userId, accessToken) {
  let profile;
  try {
    profile = await fetchProfile(userId, accessToken);
  } catch (profileErr) {
    const err = new Error(
      profileErr instanceof Error ? profileErr.message : 'Erreur lors du chargement du profil',
    );
    err.status = 500;
    throw err;
  }

  if (!profile) {
    const err = new Error(
      isSupabaseAdminReady()
        ? 'Profil introuvable'
        : 'Configuration serveur incomplète — ajoutez SUPABASE_SERVICE_ROLE_KEY dans .env',
    );
    err.status = isSupabaseAdminReady() ? 404 : 503;
    throw err;
  }

  if (profile.is_suspended) {
    const err = new Error('Compte suspendu');
    err.status = 403;
    throw err;
  }

  if (profile.is_active === false) {
    const err = new Error('Compte inactif');
    err.status = 403;
    throw err;
  }

  if (isSupabaseAdminReady()) {
    await supabaseAdmin.rpc('ensure_driver_from_profile', { p_user_id: userId });
  }

  let driver = null;
  if (isSupabaseAdminReady()) {
    const { data } = await supabaseAdmin
      .from('drivers')
      .select('id, name, fleet_name, status, truck_id')
      .eq('user_id', userId)
      .maybeSingle();
    driver = data;
  } else if (accessToken) {
    const url = getSupabaseUrl();
    const anonKey = getSupabaseAnonKey();
    if (url && anonKey) {
      const userClient = createClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });
      const { data } = await userClient
        .from('drivers')
        .select('id, name, fleet_name, status, truck_id')
        .eq('user_id', userId)
        .maybeSingle();
      driver = data;
    }
  }

  return { profile, driver };
}

export function displayDriverName(profile, driver, fallbackEmail) {
  return driver?.name
    || profile.pseudo
    || profile.full_name
    || fallbackEmail?.split('@')[0]
    || 'Chauffeur';
}

export function displayCompany(driver) {
  return driver?.fleet_name || 'Z&D Thermoliner';
}
