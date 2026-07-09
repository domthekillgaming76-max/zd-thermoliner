import { supabaseAdmin, isSupabaseAdminReady } from '../../lib/supabaseAdmin.mjs';

const DRIVER_ROLES = new Set(['chauffeur', 'driver', 'member', 'tractionnaire']);

export function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export async function requireClientAuth(req, res, next) {
  if (!isSupabaseAdminReady()) {
    return res.status(503).json({ error: 'Service ERP non configuré', message: 'SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis' });
  }

  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Token manquant', message: 'Authorization: Bearer <token> requis' });
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }

  req.clientUser = user;
  req.clientToken = token;
  return next();
}

export async function loadClientContext(userId) {
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, pseudo, role, is_suspended, is_active')
    .eq('id', userId)
    .maybeSingle();

  if (profileErr || !profile) {
    const err = new Error('Profil introuvable');
    err.status = 404;
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

  if (!DRIVER_ROLES.has(profile.role)) {
    const err = new Error('Accès client réservé aux chauffeurs');
    err.status = 403;
    throw err;
  }

  await supabaseAdmin.rpc('ensure_driver_from_profile', { p_user_id: userId });

  const { data: driver } = await supabaseAdmin
    .from('drivers')
    .select('id, name, fleet_name, status, truck_id')
    .eq('user_id', userId)
    .maybeSingle();

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
