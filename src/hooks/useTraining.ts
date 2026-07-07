import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import type { LessonInput, QuizInput } from '../lib/trainingTypes';
import {
  acceptRules,
  assignOnboarding,
  completeLesson,
  completeOnboarding,
  createLesson,
  createQuiz,
  deleteLesson,
  deleteQuiz,
  fetchQuizQuestions,
  fetchTrainingBundle,
  submitQuizAttempt,
  updateLesson,
} from '../services/trainingService';

export function useTraining(
  userId?: string,
  role?: string | null,
  email?: string | null,
  applicationStatus?: string | null,
) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.training.module(userId),
    queryFn: () => fetchTrainingBundle(userId!, role, email, applicationStatus),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.training.all });

  const acceptRulesMutation = useMutation({
    mutationFn: () => acceptRules(userId!),
    onSuccess: invalidate,
  });

  const completeLessonMutation = useMutation({
    mutationFn: (lessonId: string) => completeLesson(userId!, lessonId),
    onSuccess: invalidate,
  });

  const submitQuiz = useMutation({
    mutationFn: ({ quizId, answers }: { quizId: string; answers: Record<string, string> }) =>
      submitQuizAttempt(userId!, quizId, answers),
    onSuccess: invalidate,
  });

  const createLessonMutation = useMutation({
    mutationFn: (input: LessonInput) => createLesson(input),
    onSuccess: invalidate,
  });

  const updateLessonMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<LessonInput> }) => updateLesson(id, input),
    onSuccess: invalidate,
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (id: string) => deleteLesson(id),
    onSuccess: invalidate,
  });

  const createQuizMutation = useMutation({
    mutationFn: (input: QuizInput) => createQuiz(input),
    onSuccess: invalidate,
  });

  const deleteQuizMutation = useMutation({
    mutationFn: (id: string) => deleteQuiz(id),
    onSuccess: invalidate,
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: (targetUserId: string) => completeOnboarding(targetUserId, role, email),
    onSuccess: invalidate,
  });

  const assignOnboardingMutation = useMutation({
    mutationFn: (applicationId?: string) => assignOnboarding(userId!, applicationId),
    onSuccess: invalidate,
  });

  return {
    ...query,
    acceptRules: acceptRulesMutation,
    completeLesson: completeLessonMutation,
    submitQuiz,
    createLesson: createLessonMutation,
    updateLesson: updateLessonMutation,
    deleteLesson: deleteLessonMutation,
    createQuiz: createQuizMutation,
    deleteQuiz: deleteQuizMutation,
    completeOnboarding: completeOnboardingMutation,
    assignOnboarding: assignOnboardingMutation,
    fetchQuizQuestions,
    invalidate,
  };
}
