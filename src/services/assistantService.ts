import { supabase } from '../lib/supabase';
import type {
  AiConversation,
  AiMessage,
  AiMessageMetadata,
  AutomationTask,
  AssistantAction,
} from '../lib/assistantTypes';
import { fetchAssistantSnapshot } from './assistantDataService';
import { generateAssistantReply } from './assistantEngine';
import { canTriggerAutomations } from '../lib/assistantPermissions';
import { isDom76Protected } from '../lib/dom76Protection';

function isAssistantSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return error.code === '42P01' || error.code === 'PGRST205' || msg.includes('does not exist');
}

export async function fetchOrCreateConversation(userId: string): Promise<AiConversation> {
  const { data: existing } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing as AiConversation;

  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({ user_id: userId, title: 'Assistant Z&D' })
    .select()
    .single();
  if (error) throw error;
  return data as AiConversation;
}

export async function fetchConversationMessages(conversationId: string): Promise<AiMessage[]> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) {
    if (isAssistantSchemaError(error)) return [];
    throw error;
  }
  return (data ?? []).map(m => ({
    ...m,
    metadata: (m.metadata ?? {}) as AiMessageMetadata,
  })) as AiMessage[];
}

export async function sendAssistantMessage(
  conversationId: string,
  userId: string,
  content: string,
  role: string | null | undefined,
  email?: string | null,
): Promise<{ userMessage: AiMessage; assistantMessage: AiMessage }> {
  const { data: userMsg, error: userErr } = await supabase
    .from('ai_messages')
    .insert({ conversation_id: conversationId, role: 'user', content: content.trim() })
    .select()
    .single();
  if (userErr) throw userErr;

  const { snapshot } = await fetchAssistantSnapshot(userId, role, email);
  const reply = generateAssistantReply(content, snapshot, role, email);

  const { data: assistantMsg, error: assistErr } = await supabase
    .from('ai_messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: reply.content,
      metadata: reply.metadata,
    })
    .select()
    .single();
  if (assistErr) throw assistErr;

  await supabase
    .from('ai_conversations')
    .update({ updated_at: new Date().toISOString(), title: content.slice(0, 60) })
    .eq('id', conversationId);

  await logAssistantAction(userId, 'query', null, null, { question: content });

  return {
    userMessage: { ...userMsg, metadata: {} } as AiMessage,
    assistantMessage: { ...assistantMsg, metadata: reply.metadata } as AiMessage,
  };
}

export async function logAssistantAction(
  userId: string,
  actionType: string,
  targetType: string | null,
  targetId: string | null,
  payload: Record<string, unknown>,
  status: AssistantAction['status'] = 'logged',
): Promise<void> {
  await supabase.from('assistant_actions').insert({
    user_id: userId,
    action_type: actionType,
    target_type: targetType,
    target_id: targetId,
    payload,
    status,
  });
}

export async function createAutomationTask(
  userId: string,
  taskType: string,
  title: string,
  description: string,
  payload: Record<string, unknown>,
  role: string | null | undefined,
  email?: string | null,
): Promise<AutomationTask> {
  if (!canTriggerAutomations(role, email)) {
    throw new Error('Seuls les administrateurs peuvent déclencher des automatisations.');
  }

  if (isDom76Protected(email) && ['delete', 'ban', 'fire'].includes(taskType)) {
    throw new Error('Action interdite sur le compte propriétaire DOM76.');
  }

  const { data, error } = await supabase
    .from('automation_tasks')
    .insert({
      user_id: userId,
      task_type: taskType,
      title,
      description,
      payload,
      requires_confirmation: true,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;

  await logAssistantAction(userId, taskType, 'automation', data.id, payload, 'pending_confirmation');
  return data as AutomationTask;
}

export async function confirmAutomationTask(
  taskId: string,
  userId: string,
  role: string | null | undefined,
  email?: string | null,
): Promise<AutomationTask> {
  if (!canTriggerAutomations(role, email)) {
    throw new Error('Confirmation réservée aux administrateurs.');
  }

  const { data, error } = await supabase
    .from('automation_tasks')
    .update({ status: 'confirmed', completed_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;

  await logAssistantAction(userId, data.task_type, 'automation', taskId, data.payload as Record<string, unknown>, 'executed');
  return data as AutomationTask;
}

export async function fetchAssistantBundle(
  userId: string,
  role: string | null | undefined,
  email?: string | null,
) {
  const { error: probe } = await supabase.from('ai_conversations').select('id').limit(1);
  const migrationRequired = !!probe && isAssistantSchemaError(probe);

  if (migrationRequired) {
    return { conversation: null, messages: [], migrationRequired: true, snapshot: null };
  }

  const conversation = await fetchOrCreateConversation(userId);
  const [messages, { snapshot }] = await Promise.all([
    fetchConversationMessages(conversation.id),
    fetchAssistantSnapshot(userId, role, email),
  ]);

  return { conversation, messages, migrationRequired: false, snapshot };
}
