import { supabase } from '../lib/supabase';
import type { RecruitmentApplicationRecord, RecruitmentFormInput } from '../lib/recruitmentTypes';

function normalizeApplication(row: Record<string, unknown>): RecruitmentApplicationRecord {
  return {
    id: row.id as string,
    user_id: (row.user_id as string) ?? null,
    email: (row.email as string) ?? null,
    candidate_type: (row.candidate_type as RecruitmentApplicationRecord['candidate_type']) ?? 'chauffeur_rp',
    pseudo: (row.pseudo as string) ?? '',
    age: Number(row.age ?? 0),
    country: (row.country as string) ?? '',
    timezone: (row.timezone as string) ?? '',
    experience: (row.experience as string) ?? (row.ets2_experience as string) ?? '',
    total_km: (row.total_km as string) ?? '',
    previous_vtc: Boolean(row.previous_vtc),
    previous_vtc_reason: (row.previous_vtc_reason as string) ?? '',
    truckersmp: Boolean(row.truckersmp),
    active_bans: (row.active_bans as string) ?? '',
    available_days: (row.available_days as string) ?? '',
    available_hours: (row.available_hours as string) ?? '',
    play_frequency: (row.play_frequency as string) ?? '',
    motivation: (row.motivation as string) ?? '',
    contribution: (row.contribution as string) ?? '',
    accepts_rules: Boolean(row.accepts_rules),
    driving_style: (row.driving_style as string) ?? '',
    discord_ok: Boolean(row.discord_ok),
    long_distance_ok: Boolean(row.long_distance_ok),
    realism_rules_ok: Boolean(row.realism_rules_ok),
    status: (row.status as RecruitmentApplicationRecord['status']) ?? 'pending',
    reviewed_by: (row.reviewed_by as string) ?? null,
    reviewed_at: (row.reviewed_at as string) ?? null,
    admin_notes: (row.admin_notes as string) ?? null,
    created_at: row.created_at as string,
    updated_at: (row.updated_at as string) ?? (row.created_at as string),
    assigned_role: (row.assigned_role as string) ?? null,
  };
}

function formToPayload(userId: string, email: string, input: RecruitmentFormInput) {
  return {
    user_id: userId,
    email,
    candidate_type: input.candidate_type,
    pseudo: input.pseudo.trim(),
    age: input.age,
    country: input.country.trim(),
    timezone: input.timezone.trim(),
    experience: input.experience.trim(),
    ets2_experience: input.experience.trim(),
    total_km: input.total_km.trim(),
    previous_vtc: input.previous_vtc,
    previous_vtc_reason: input.previous_vtc_reason.trim() || null,
    truckersmp: input.truckersmp,
    active_bans: input.active_bans.trim() || null,
    available_days: input.available_days.trim(),
    available_hours: input.available_hours.trim(),
    play_frequency: input.play_frequency.trim(),
    motivation: input.motivation.trim(),
    contribution: input.contribution.trim(),
    accepts_rules: input.accepts_rules,
    driving_style: input.driving_style.trim(),
    discord_ok: input.discord_ok,
    long_distance_ok: input.long_distance_ok,
    realism_rules_ok: input.realism_rules_ok,
    discord: 'Via formulaire ERP',
    has_trucksbook: false,
    status: 'pending' as const,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchMyApplication(userId: string): Promise<RecruitmentApplicationRecord | null> {
  const { data, error } = await supabase
    .from('recruitment_applications')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? normalizeApplication(data as Record<string, unknown>) : null;
}

export async function fetchAllApplications(): Promise<RecruitmentApplicationRecord[]> {
  const { data, error } = await supabase
    .from('recruitment_applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(row => normalizeApplication(row as Record<string, unknown>));
}

export async function submitApplication(
  userId: string,
  email: string,
  input: RecruitmentFormInput,
): Promise<RecruitmentApplicationRecord> {
  const payload = formToPayload(userId, email, input);
  const { data, error } = await supabase
    .from('recruitment_applications')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  await supabase
    .from('profiles')
    .update({ application_status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', userId);

  const { error: onboardErr } = await supabase.rpc('assign_onboarding_checklist', {
    p_user_id: userId,
    p_application_id: null,
  });
  if (onboardErr && !onboardErr.message.includes('does not exist')) {
    console.warn('[Z&D] onboarding checklist:', onboardErr.message);
  }

  return normalizeApplication(data as Record<string, unknown>);
}

export async function approveApplication(
  appId: string,
  assignedRole: 'chauffeur' | 'tractionnaire' = 'chauffeur',
  adminNotes?: string,
): Promise<void> {
  const { error } = await supabase.rpc('approve_application', {
    app_id: appId,
    assigned_role: assignedRole,
    reviewer_notes: adminNotes ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function rejectApplication(appId: string, adminNotes?: string): Promise<void> {
  const { error } = await supabase.rpc('reject_application', {
    app_id: appId,
    reviewer_notes: adminNotes ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function setAccountRole(userId: string, role: 'visitor' | 'candidat'): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}
