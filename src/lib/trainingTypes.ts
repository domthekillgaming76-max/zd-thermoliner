export type TrainingLessonCategory =
  | 'new_recruit'
  | 'driver'
  | 'convoy'
  | 'economy'
  | 'road_sheets'
  | 'fleet'
  | 'safety'
  | 'admin';

export type TrainingStatus = 'draft' | 'published' | 'archived';
export type QuestionType = 'multiple_choice' | 'true_false';
export type OnboardingStatus = 'pending' | 'in_progress' | 'completed';

export interface RulesSection {
  id: string;
  slug: string;
  title: string;
  content: string;
  sort_order: number;
  is_public: boolean;
  required_role: string | null;
}

export interface TrainingLesson {
  id: string;
  title: string;
  description: string | null;
  category: TrainingLessonCategory;
  video_url: string | null;
  content: string;
  duration_minutes: number;
  required_role: string;
  status: TrainingStatus;
  sort_order: number;
  completed?: boolean;
  progress_percent?: number;
}

export interface TrainingQuiz {
  id: string;
  title: string;
  description: string | null;
  lesson_id: string | null;
  category: string;
  min_score: number;
  max_attempts: number;
  unlocks_certification: string | null;
  required_role: string;
  status: TrainingStatus;
  sort_order: number;
  question_count?: number;
  best_score?: number;
  attempts_used?: number;
  passed?: boolean;
}

export interface TrainingQuestion {
  id: string;
  quiz_id: string;
  question_type: QuestionType;
  question_text: string;
  options: string[];
  correct_answer: string;
  sort_order: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  passed: boolean;
  answers: Record<string, string>;
  attempt_number: number;
  completed_at: string;
}

export interface DriverCertification {
  id: string;
  user_id: string;
  driver_id: string | null;
  cert_slug: string;
  cert_name: string;
  earned_at: string;
  expires_at: string | null;
}

export interface OnboardingChecklist {
  id: string;
  user_id: string;
  application_id: string | null;
  rules_accepted_at: string | null;
  first_quiz_passed_at: string | null;
  training_completed_at: string | null;
  status: OnboardingStatus;
  require_driver_unlock: boolean;
  driver_unlocked_at: string | null;
  assigned_at: string;
  completed_at: string | null;
}

export interface TrainingDashboard {
  rulesToRead: number;
  totalLessons: number;
  completedLessons: number;
  pendingQuizzes: number;
  certificationsEarned: number;
  onboardingPercent: number;
}

export interface TrainingBundle {
  dashboard: TrainingDashboard;
  rules: RulesSection[];
  lessons: TrainingLesson[];
  quizzes: TrainingQuiz[];
  certifications: DriverCertification[];
  onboarding: OnboardingChecklist | null;
  migrationRequired: boolean;
}

export interface LessonInput {
  title: string;
  description?: string;
  category: TrainingLessonCategory;
  video_url?: string;
  content: string;
  duration_minutes?: number;
  required_role?: string;
  status?: TrainingStatus;
}

export interface QuizInput {
  title: string;
  description?: string;
  category?: string;
  min_score?: number;
  max_attempts?: number;
  unlocks_certification?: string;
  required_role?: string;
  status?: TrainingStatus;
}

export const CERTIFICATION_DEFS: Record<string, { name: string; color: string }> = {
  zd_driver_license: { name: 'Licence Chauffeur Z&D', color: '#ef4444' },
  convoy_certified: { name: 'Convoy Certified', color: '#f97316' },
  long_distance_certified: { name: 'Long Distance Certified', color: '#22d3ee' },
  adr_certified_rp: { name: 'ADR Certified RP', color: '#a78bfa' },
  eco_driving_certified: { name: 'Eco Driving Certified', color: '#10b981' },
  dispatcher_certified: { name: 'Dispatcher Certified', color: '#fbbf24' },
};

export const LESSON_CATEGORY_LABELS: Record<TrainingLessonCategory, string> = {
  new_recruit: 'Nouvelle recrue',
  driver: 'Chauffeur',
  convoy: 'Convoi',
  economy: 'Économie',
  road_sheets: 'Feuilles de route',
  fleet: 'Flotte',
  safety: 'Sécurité',
  admin: 'Admin',
};

export function certName(slug: string): string {
  return CERTIFICATION_DEFS[slug]?.name ?? slug;
}
