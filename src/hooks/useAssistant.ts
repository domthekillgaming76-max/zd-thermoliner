import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import {
  confirmAutomationTask,
  createAutomationTask,
  fetchAssistantBundle,
  sendAssistantMessage,
} from '../services/assistantService';

export function useAssistant(
  userId?: string,
  role?: string | null,
  email?: string | null,
) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.assistant.module(userId),
    queryFn: () => fetchAssistantBundle(userId!, role, email),
    enabled: !!userId,
    staleTime: 10_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.assistant.all });

  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      sendAssistantMessage(query.data!.conversation!.id, userId!, content, role, email),
    onSuccess: invalidate,
  });

  const createTask = useMutation({
    mutationFn: (input: { taskType: string; title: string; description: string; payload?: Record<string, unknown> }) =>
      createAutomationTask(userId!, input.taskType, input.title, input.description, input.payload ?? {}, role, email),
    onSuccess: invalidate,
  });

  const confirmTask = useMutation({
    mutationFn: (taskId: string) => confirmAutomationTask(taskId, userId!, role, email),
    onSuccess: invalidate,
  });

  return { ...query, sendMessage, createTask, confirmTask };
}
