import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  AlertTriangle, GraduationCap, Plus, RefreshCw, BookOpen, ClipboardList, Award, ListChecks,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';
import { TrainingCertificationBadges } from '../components/training/TrainingCertificationBadges';
import { TrainingDashboardPanel } from '../components/training/TrainingDashboardPanel';
import { TrainingLessonCard } from '../components/training/TrainingLessonCard';
import { TrainingLessonFormModal } from '../components/training/TrainingLessonFormModal';
import { TrainingLessonModal } from '../components/training/TrainingLessonModal';
import { TrainingOnboardingPanel } from '../components/training/TrainingOnboardingPanel';
import { TrainingQuizPanel } from '../components/training/TrainingQuizPanel';
import { TrainingRulesPanel } from '../components/training/TrainingRulesPanel';
import { useAuth } from '../contexts/AuthContext';
import { useTraining } from '../hooks/useTraining';
import { canAccessTrainingCenter, canManageTraining } from '../lib/trainingPermissions';
import type { TrainingLesson, TrainingQuestion, TrainingQuiz } from '../lib/trainingTypes';

type Tab = 'dashboard' | 'rules' | 'lessons' | 'quizzes' | 'certifications' | 'onboarding';

const TABS: { key: Tab; label: string; icon: typeof BookOpen }[] = [
  { key: 'dashboard', label: 'Tableau', icon: GraduationCap },
  { key: 'rules', label: 'Règles', icon: BookOpen },
  { key: 'lessons', label: 'Leçons', icon: GraduationCap },
  { key: 'quizzes', label: 'Quiz', icon: ClipboardList },
  { key: 'certifications', label: 'Certifications', icon: Award },
  { key: 'onboarding', label: 'Onboarding', icon: ListChecks },
];

export function TrainingCenterPage() {
  const { user, profile } = useAuth();
  const email = user?.email ?? profile?.email;
  const role = profile?.role;

  const canAccess = canAccessTrainingCenter(role, email);
  const canManage = canManageTraining(role, email);

  const [tab, setTab] = useState<Tab>('dashboard');
  const [lessonOpen, setLessonOpen] = useState<TrainingLesson | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState<TrainingQuiz | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<TrainingQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean; certification?: string } | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    data, isLoading, isFetching, isError, error, refetch,
    acceptRules, completeLesson, submitQuiz, createLesson,
    fetchQuizQuestions,
  } = useTraining(user?.id, role, email, profile?.application_status);

  const rulesAccepted = !!data?.onboarding?.rules_accepted_at || data?.dashboard.rulesToRead === 0;
  const busy = acceptRules.isPending || completeLesson.isPending || submitQuiz.isPending || createLesson.isPending;

  if (!canAccess) {
    return (
      <Navigate to="/wall" replace state={{ accessDenied: 'Accès réservé au centre de formation.' }} />
    );
  }

  async function handleRefresh() {
    setPageError(null);
    const result = await refetch();
    if (result.error) {
      setPageError(result.error instanceof Error ? result.error.message : 'Erreur actualisation.');
      return;
    }
    setSuccessMessage('Formation actualisée.');
  }

  async function openQuiz(quiz: TrainingQuiz) {
    setQuizOpen(quiz);
    setQuizResult(null);
    setQuizLoading(true);
    try {
      const qs = await fetchQuizQuestions(quiz.id);
      setQuizQuestions(qs);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Erreur chargement quiz.');
      setQuizOpen(null);
    } finally {
      setQuizLoading(false);
    }
  }

  async function handleQuizSubmit(answers: Record<string, string>) {
    if (!quizOpen) return;
    setPageError(null);
    try {
      const result = await submitQuiz.mutateAsync({ quizId: quizOpen.id, answers });
      setQuizResult(result);
      if (result.passed) {
        setSuccessMessage(result.certification ? 'Quiz réussi — certification débloquée !' : 'Quiz réussi !');
      }
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Erreur soumission quiz.');
    }
  }

  return (
    <Layout>
      <div className="training-module space-y-6 pb-24 md:pb-8">
        <PageHeader
          icon={GraduationCap}
          title="Centre Formation & Règles"
          subtitle="Onboarding, règlement intérieur, leçons et certifications Z&D"
          actions={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isFetching}
                className="erp-btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? 'Chargement…' : 'Actualiser'}
              </button>
              {canManage && tab === 'lessons' && (
                <button type="button" onClick={() => setFormOpen(true)} className="erp-btn-primary flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" />Nouvelle leçon
                </button>
              )}
            </div>
          }
        />

        {data?.migrationRequired && (
          <div className="training-glass rounded-2xl p-4 flex items-start gap-3 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-amber-400 text-sm">Migration requise</p>
              <p className="text-xs text-white/50 mt-1">Exécutez <code className="text-white/70">npx supabase db push</code> (migration 044).</p>
            </div>
          </div>
        )}

        {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}
        {successMessage && <FormSuccess message={successMessage} onDismiss={() => setSuccessMessage(null)} />}
        {isError && <FormAlert message={error instanceof Error ? error.message : 'Erreur chargement.'} />}

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                tab === t.key
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : 'bg-white/5 text-white/40 border-white/8'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {(tab === 'dashboard' || tab === 'onboarding') && (
          <>
            <TrainingDashboardPanel dashboard={data?.dashboard ?? {
              rulesToRead: 0, totalLessons: 0, completedLessons: 0,
              pendingQuizzes: 0, certificationsEarned: 0, onboardingPercent: 0,
            }} loading={isLoading} />
            {tab === 'onboarding' && (
              <TrainingOnboardingPanel
                onboarding={data?.onboarding ?? null}
                rulesAccepted={rulesAccepted}
                quizPassed={!!data?.onboarding?.first_quiz_passed_at}
                lessonsDone={data?.dashboard.completedLessons ?? 0}
                certsEarned={data?.certifications.length ?? 0}
              />
            )}
          </>
        )}

        {tab === 'rules' && (
          <TrainingRulesPanel
            rules={data?.rules ?? []}
            rulesAccepted={rulesAccepted}
            onAccept={async () => {
              setPageError(null);
              try {
                await acceptRules.mutateAsync();
                setSuccessMessage('Règles acceptées.');
              } catch (err) {
                setPageError(err instanceof Error ? err.message : 'Erreur.');
              }
            }}
            accepting={acceptRules.isPending}
          />
        )}

        {tab === 'lessons' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(data?.lessons ?? []).map(lesson => (
              <TrainingLessonCard
                key={lesson.id}
                lesson={lesson}
                busy={busy}
                onOpen={() => setLessonOpen(lesson)}
                onComplete={async () => {
                  setPageError(null);
                  try {
                    await completeLesson.mutateAsync(lesson.id);
                    setSuccessMessage('Leçon terminée.');
                  } catch (err) {
                    setPageError(err instanceof Error ? err.message : 'Erreur.');
                  }
                }}
              />
            ))}
          </div>
        )}

        {tab === 'quizzes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(data?.quizzes ?? []).map(quiz => (
              <div key={quiz.id} className="training-lesson-card rounded-2xl p-4 training-card-hover">
                <h3 className="font-bold text-white">{quiz.title}</h3>
                <p className="text-xs text-white/40 mt-1">{quiz.description}</p>
                <div className="flex flex-wrap gap-2 mt-3 text-[10px]">
                  <span className="px-2 py-1 rounded-full bg-white/5 text-white/40">Min {quiz.min_score}%</span>
                  <span className="px-2 py-1 rounded-full bg-white/5 text-white/40">{quiz.attempts_used ?? 0}/{quiz.max_attempts} essais</span>
                  {quiz.passed && <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">Réussi</span>}
                  {quiz.unlocks_certification && <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">Certif.</span>}
                </div>
                <button
                  type="button"
                  onClick={() => openQuiz(quiz)}
                  disabled={quiz.passed || (quiz.attempts_used ?? 0) >= quiz.max_attempts}
                  className="erp-btn-primary w-full mt-4 text-xs py-2 disabled:opacity-40"
                >
                  {quiz.passed ? 'Quiz réussi' : 'Commencer le quiz'}
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'certifications' && (
          <TrainingCertificationBadges certifications={data?.certifications ?? []} />
        )}

        <TrainingLessonModal
          lesson={lessonOpen}
          onClose={() => setLessonOpen(null)}
          busy={completeLesson.isPending}
          onComplete={lessonOpen ? async () => {
            setPageError(null);
            try {
              await completeLesson.mutateAsync(lessonOpen.id);
              setLessonOpen(null);
              setSuccessMessage('Leçon terminée.');
            } catch (err) {
              setPageError(err instanceof Error ? err.message : 'Erreur.');
            }
          } : undefined}
        />

        <TrainingQuizPanel
          quiz={quizOpen}
          questions={quizQuestions}
          loading={quizLoading}
          submitting={submitQuiz.isPending}
          result={quizResult}
          onClose={() => { setQuizOpen(null); setQuizResult(null); }}
          onSubmit={handleQuizSubmit}
        />

        <TrainingLessonFormModal
          open={formOpen}
          saving={createLesson.isPending}
          onClose={() => setFormOpen(false)}
          onSubmit={async input => {
            setPageError(null);
            try {
              await createLesson.mutateAsync(input);
              setFormOpen(false);
              setSuccessMessage('Leçon publiée.');
            } catch (err) {
              setPageError(err instanceof Error ? err.message : 'Erreur création.');
            }
          }}
        />
      </div>
    </Layout>
  );
}
