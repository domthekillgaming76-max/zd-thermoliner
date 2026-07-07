-- 034 — AI Assistant & Automation (additive)

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nouvelle conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON public.ai_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS public.automation_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_type text NOT NULL,
  title text NOT NULL,
  description text,
  payload jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  requires_confirmation boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_automation_tasks_user ON public.automation_tasks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_tasks_status ON public.automation_tasks(status);

CREATE TABLE IF NOT EXISTS public.assistant_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_type text,
  target_id uuid,
  payload jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'logged'
    CHECK (status IN ('logged', 'pending_confirmation', 'executed', 'cancelled', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_actions_user ON public.assistant_actions(user_id, created_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_actions ENABLE ROW LEVEL SECURITY;

-- Conversations: own + admin read-all
DROP POLICY IF EXISTS "ai_conversations_select" ON public.ai_conversations;
CREATE POLICY "ai_conversations_select" ON public.ai_conversations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "ai_conversations_insert" ON public.ai_conversations;
CREATE POLICY "ai_conversations_insert" ON public.ai_conversations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ai_conversations_update" ON public.ai_conversations;
CREATE POLICY "ai_conversations_update" ON public.ai_conversations
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ai_conversations_delete" ON public.ai_conversations;
CREATE POLICY "ai_conversations_delete" ON public.ai_conversations
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_erp_admin(auth.uid()));

-- Messages: via conversation ownership
DROP POLICY IF EXISTS "ai_messages_select" ON public.ai_messages;
CREATE POLICY "ai_messages_select" ON public.ai_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR public.is_erp_admin(auth.uid()))
  ));

DROP POLICY IF EXISTS "ai_messages_insert" ON public.ai_messages;
CREATE POLICY "ai_messages_insert" ON public.ai_messages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()
  ));

-- Automation tasks
DROP POLICY IF EXISTS "automation_tasks_select" ON public.automation_tasks;
CREATE POLICY "automation_tasks_select" ON public.automation_tasks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "automation_tasks_insert" ON public.automation_tasks;
CREATE POLICY "automation_tasks_insert" ON public.automation_tasks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "automation_tasks_update" ON public.automation_tasks;
CREATE POLICY "automation_tasks_update" ON public.automation_tasks
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_erp_admin(auth.uid()));

-- Assistant action logs
DROP POLICY IF EXISTS "assistant_actions_select" ON public.assistant_actions;
CREATE POLICY "assistant_actions_select" ON public.assistant_actions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "assistant_actions_insert" ON public.assistant_actions;
CREATE POLICY "assistant_actions_insert" ON public.assistant_actions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.ai_conversations IS 'AI assistant chat sessions';
COMMENT ON TABLE public.assistant_actions IS 'Audit log of assistant-triggered actions';
