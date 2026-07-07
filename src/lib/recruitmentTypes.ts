export type CandidateType = 'chauffeur_rp' | 'visiteur';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface RecruitmentFormInput {
  candidate_type: CandidateType;
  pseudo: string;
  age: number;
  country: string;
  timezone: string;
  experience: string;
  total_km: string;
  previous_vtc: boolean;
  previous_vtc_reason: string;
  truckersmp: boolean;
  active_bans: string;
  available_days: string;
  available_hours: string;
  play_frequency: string;
  motivation: string;
  contribution: string;
  accepts_rules: boolean;
  driving_style: string;
  discord_ok: boolean;
  long_distance_ok: boolean;
  realism_rules_ok: boolean;
}

export interface RecruitmentApplicationRecord extends RecruitmentFormInput {
  id: string;
  user_id: string | null;
  email: string | null;
  status: ApplicationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  assigned_role?: string | null;
  ets2_experience?: string | null;
  discord?: string | null;
}

export const EMPTY_RECRUITMENT_FORM: RecruitmentFormInput = {
  candidate_type: 'chauffeur_rp',
  pseudo: '',
  age: 18,
  country: '',
  timezone: '',
  experience: '',
  total_km: '',
  previous_vtc: false,
  previous_vtc_reason: '',
  truckersmp: false,
  active_bans: '',
  available_days: '',
  available_hours: '',
  play_frequency: '',
  motivation: '',
  contribution: '',
  accepts_rules: false,
  driving_style: '',
  discord_ok: false,
  long_distance_ok: false,
  realism_rules_ok: false,
};

export const STATUS_LABELS: Record<ApplicationStatus, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  approved: { label: 'Acceptée', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  rejected: { label: 'Refusée', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
};

export const CANDIDATE_TYPE_LABELS: Record<CandidateType, string> = {
  chauffeur_rp: 'Chauffeur RP',
  visiteur: 'Visiteur',
};
