import { supabaseAdmin } from '../../lib/supabaseAdmin.mjs';
import { loadClientContext } from './middleware.mjs';

function serialize(row) {
  if (!row) return null;
  return {
    id: row.id, game: row.game, status: row.status, payload: row.payload ?? {},
    requestedAt: row.requested_at, claimedAt: row.claimed_at,
    completedAt: row.completed_at, errorCode: row.error_code,
    errorMessage: row.error_message, result: row.result ?? {},
  };
}

export async function handleDispatchPending(req, res) {
  try {
    const { profile } = await loadClientContext(req.clientUser.id, req.clientToken);
    const { data, error } = await supabaseAdmin.from('game_dispatch_jobs').select('*')
      .eq('profile_id', profile.id).in('status', ['pending', 'claimed'])
      .order('requested_at', { ascending: true }).limit(1).maybeSingle();
    if (error) throw error;
    return res.json({ success: true, dispatch: serialize(data) });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, error: err.message || 'Erreur serveur' });
  }
}

export async function handleDispatchClaim(req, res) {
  try {
    const { profile } = await loadClientContext(req.clientUser.id, req.clientToken);
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin.from('game_dispatch_jobs').update({
      status: 'claimed', claimed_at: now,
      client_version: String(req.body?.clientVersion || '').slice(0, 40) || null,
      error_code: null, error_message: null, updated_at: now,
    }).eq('id', req.params.id).eq('profile_id', profile.id).eq('status', 'pending')
      .select('*').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(409).json({ success: false, error: 'Mission déjà prise ou introuvable' });
    return res.json({ success: true, dispatch: serialize(data) });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, error: err.message || 'Erreur serveur' });
  }
}

export async function handleDispatchComplete(req, res) {
  try {
    const { profile } = await loadClientContext(req.clientUser.id, req.clientToken);
    const status = req.body?.success === false ? 'failed' : 'injected';
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin.from('game_dispatch_jobs').update({
      status, completed_at: now,
      error_code: status === 'failed' ? String(req.body?.errorCode || 'INJECTION_FAILED').slice(0, 80) : null,
      error_message: status === 'failed' ? String(req.body?.errorMessage || 'Échec de l’injection').slice(0, 1000) : null,
      result: req.body?.result && typeof req.body.result === 'object' ? req.body.result : {},
      updated_at: now,
    }).eq('id', req.params.id).eq('profile_id', profile.id)
      .in('status', ['pending', 'claimed']).select('*').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Mission introuvable' });
    return res.json({ success: true, dispatch: serialize(data) });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, error: err.message || 'Erreur serveur' });
  }
}
