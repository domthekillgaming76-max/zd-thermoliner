import { supabase } from '../lib/supabase';
import { normalizeRole } from '../lib/roleEngine';
import { canManageTraining } from '../lib/trainingPermissions';
import type {
  DriverCertification,
  LessonInput,
  OnboardingChecklist,
  QuizInput,
  RulesSection,
  TrainingBundle,
  TrainingDashboard,
  TrainingLesson,
  TrainingQuestion,
  TrainingQuiz,
} from '../lib/trainingTypes';
import { CERTIFICATION_DEFS, certName } from '../lib/trainingTypes';
import { fetchDriverByUserId } from './roadSheetService';

function isTrainingSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return error.code === '42P01' || error.code === 'PGRST205' || msg.includes('does not exist');
}

function roleCanAccess(requiredRole: string, userRole?: string | null): boolean {
  if (!requiredRole || requiredRole === 'all') return true;
  if (!userRole) return false;
  const norm = normalizeRole(userRole);
  if (requiredRole === userRole || normalizeRole(requiredRole) === norm) return true;
  if (norm === 'admin') return true;
  if (requiredRole === 'chauffeur' && norm === 'chauffeur') return true;
  if (requiredRole === 'dispatcher' && norm === 'chauffeur') return true;
  if (requiredRole === 'flotte' && norm === 'chauffeur') return true;
  return false;
}

function buildDashboard(
  rules: RulesSection[],
  lessons: TrainingLesson[],
  quizzes: TrainingQuiz[],
  certs: DriverCertification[],
  onboarding: OnboardingChecklist | null,
  rulesAccepted: boolean,
): TrainingDashboard {
  const completedLessons = lessons.filter(l => l.completed).length;
  const pendingQuizzes = quizzes.filter(q => !q.passed).length;
  const onboardingSteps = [
    rulesAccepted || !!onboarding?.rules_accepted_at,
    !!onboarding?.first_quiz_passed_at,
    completedLessons >= Math.min(3, lessons.length),
    certs.length > 0,
  ];
  const onboardingDone = onboardingSteps.filter(Boolean).length;

  return {
    rulesToRead: rulesAccepted ? 0 : rules.length,
    totalLessons: lessons.length,
    completedLessons,
    pendingQuizzes,
    certificationsEarned: certs.length,
    onboardingPercent: onboardingSteps.length
      ? Math.round((onboardingDone / onboardingSteps.length) * 100)
      : 0,
  };
}

export async function fetchTrainingBundle(
  userId: string,
  role?: string | null,
  _email?: string | null,
  _applicationStatus?: string | null,
): Promise<TrainingBundle> {
  const { error: probe } = await supabase.from('rules_sections').select('id').limit(1);
  if (probe && isTrainingSchemaError(probe)) {
    return {
      dashboard: {
        rulesToRead: 0, totalLessons: 0, completedLessons: 0,
        pendingQuizzes: 0, certificationsEarned: 0, onboardingPercent: 0,
      },
      rules: [], lessons: [], quizzes: [], certifications: [],
      onboarding: null, migrationRequired: true,
    };
  }

  const [rulesRes, lessonsRes, progressRes, quizzesRes, attemptsRes, certsRes, onboardRes] = await Promise.all([
    supabase.from('rules_sections').select('*').order('sort_order'),
    supabase.from('training_lessons').select('*').eq('status', 'published').order('sort_order'),
    supabase.from('training_progress').select('*').eq('user_id', userId),
    supabase.from('training_quizzes').select('*').eq('status', 'published').order('sort_order'),
    supabase.from('quiz_attempts').select('*').eq('user_id', userId).order('completed_at', { ascending: false }),
    supabase.from('driver_certifications').select('*').eq('user_id', userId).order('earned_at', { ascending: false }),
    supabase.from('onboarding_checklists').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  const progressMap = new Map(
    (progressRes.data ?? []).map(p => [p.lesson_id as string, p as { progress_percent: number; completed_at: string | null }]),
  );

  const attempts = attemptsRes.data ?? [];
  const attemptsByQuiz = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const qid = a.quiz_id as string;
    if (!attemptsByQuiz.has(qid)) attemptsByQuiz.set(qid, []);
    attemptsByQuiz.get(qid)!.push(a);
  }

  const rules = (rulesRes.data ?? []) as RulesSection[];
  const onboarding = (onboardRes.data ?? null) as OnboardingChecklist | null;
  const rulesAccepted = !!onboarding?.rules_accepted_at;

  let lessons = ((lessonsRes.data ?? []) as TrainingLesson[])
    .filter(l => roleCanAccess(l.required_role, role))
    .map(l => {
      const prog = progressMap.get(l.id);
      return {
        ...l,
        progress_percent: prog?.progress_percent ?? 0,
        completed: !!prog?.completed_at || (prog?.progress_percent ?? 0) >= 100,
      };
    });

  let quizzes = ((quizzesRes.data ?? []) as TrainingQuiz[])
    .filter(q => roleCanAccess(q.required_role, role))
    .map(q => {
      const qa = attemptsByQuiz.get(q.id) ?? [];
      const best = qa.reduce((max, a) => Math.max(max, a.score as number), 0);
      const passed = qa.some(a => a.passed);
      return {
        ...q,
        attempts_used: qa.length,
        best_score: best,
        passed,
      };
    });

  const certifications = (certsRes.data ?? []) as DriverCertification[];

  return {
    dashboard: buildDashboard(rules, lessons, quizzes, certifications, onboarding, rulesAccepted),
    rules,
    lessons,
    quizzes,
    certifications,
    onboarding,
    migrationRequired: false,
  };
}

export async function acceptRules(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from('onboarding_checklists')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('onboarding_checklists').update({
      rules_accepted_at: now,
      status: 'in_progress',
    }).eq('user_id', userId);
  } else {
    await supabase.rpc('assign_onboarding_checklist', { p_user_id: userId });
    await supabase.from('onboarding_checklists').update({
      rules_accepted_at: now,
      status: 'in_progress',
    }).eq('user_id', userId);
  }
}

export async function completeLesson(userId: string, lessonId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from('training_progress').upsert({
    user_id: userId,
    lesson_id: lessonId,
    progress_percent: 100,
    completed_at: now,
    updated_at: now,
  }, { onConflict: 'user_id,lesson_id' });
}

export async function fetchQuizQuestions(quizId: string): Promise<TrainingQuestion[]> {
  const { data, error } = await supabase
    .from('training_questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []).map(q => ({
    ...q,
    options: Array.isArray(q.options) ? q.options as string[] : [],
  })) as TrainingQuestion[];
}

export async function submitQuizAttempt(
  userId: string,
  quizId: string,
  answers: Record<string, string>,
): Promise<{ score: number; passed: boolean; certification?: string }> {
  const [{ data: quiz }, questions] = await Promise.all([
    supabase.from('training_quizzes').select('*').eq('id', quizId).single(),
    fetchQuizQuestions(quizId),
  ]);

  if (!quiz) throw new Error('Quiz introuvable.');

  const { count } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quizId)
    .eq('user_id', userId);

  const attemptsUsed = count ?? 0;
  if (attemptsUsed >= (quiz.max_attempts as number)) {
    throw new Error('Nombre maximum de tentatives atteint.');
  }

  let correct = 0;
  for (const q of questions) {
    const ans = answers[q.id]?.trim().toLowerCase();
    const expected = q.correct_answer.trim().toLowerCase();
    if (ans === expected) correct++;
  }

  const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
  const passed = score >= (quiz.min_score as number);

  const { data: attempt, error } = await supabase.from('quiz_attempts').insert({
    quiz_id: quizId,
    user_id: userId,
    score,
    passed,
    answers,
    attempt_number: attemptsUsed + 1,
  }).select('id').single();

  if (error) throw error;

  if (passed) {
    const now = new Date().toISOString();
  await supabase.rpc('assign_onboarding_checklist', { p_user_id: userId });
    await supabase.from('onboarding_checklists').update({
      first_quiz_passed_at: now,
      status: 'in_progress',
    }).eq('user_id', userId);

    const certSlug = quiz.unlocks_certification as string | null;
    if (certSlug && CERTIFICATION_DEFS[certSlug]) {
      const driver = await fetchDriverByUserId(userId);
      await supabase.from('driver_certifications').upsert({
        user_id: userId,
        driver_id: driver?.id ?? null,
        cert_slug: certSlug,
        cert_name: CERTIFICATION_DEFS[certSlug].name,
        quiz_attempt_id: attempt?.id,
        earned_at: now,
      }, { onConflict: 'user_id,cert_slug' });
    }
  }

  return {
    score,
    passed,
    certification: passed ? (quiz.unlocks_certification as string) ?? undefined : undefined,
  };
}

export async function createLesson(input: LessonInput): Promise<void> {
  const { error } = await supabase.from('training_lessons').insert({
    ...input,
    status: input.status ?? 'published',
    duration_minutes: input.duration_minutes ?? 10,
    required_role: input.required_role ?? 'all',
  });
  if (error) throw error;
}

export async function updateLesson(id: string, input: Partial<LessonInput>): Promise<void> {
  const { error } = await supabase.from('training_lessons').update({
    ...input,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
}

export async function deleteLesson(id: string): Promise<void> {
  const { error } = await supabase.from('training_lessons').delete().eq('id', id);
  if (error) throw error;
}

export async function createQuiz(input: QuizInput): Promise<void> {
  const { error } = await supabase.from('training_quizzes').insert({
    ...input,
    status: input.status ?? 'published',
    min_score: input.min_score ?? 70,
    max_attempts: input.max_attempts ?? 3,
    required_role: input.required_role ?? 'all',
  });
  if (error) throw error;
}

export async function deleteQuiz(id: string): Promise<void> {
  const { error } = await supabase.from('training_quizzes').delete().eq('id', id);
  if (error) throw error;
}

export async function assignOnboarding(userId: string, applicationId?: string): Promise<void> {
  await supabase.rpc('assign_onboarding_checklist', {
    p_user_id: userId,
    p_application_id: applicationId ?? null,
  });
}

export async function completeOnboarding(
  userId: string,
  role?: string | null,
  email?: string | null,
): Promise<void> {
  if (!canManageTraining(role, email)) {
    throw new Error('Réservé aux administrateurs.');
  }
  const now = new Date().toISOString();
  await supabase.from('onboarding_checklists').update({
    status: 'completed',
    training_completed_at: now,
    completed_at: now,
    driver_unlocked_at: now,
  }).eq('user_id', userId);
}

// re-export certName for convenience
export { certName };
