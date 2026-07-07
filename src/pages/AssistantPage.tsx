import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, AlertTriangle, Loader2 } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert } from '../components/erp/FormAlert';
import { AssistantMessageBubble } from '../components/assistant/AssistantMessageBubble';
import { AssistantQuickPrompts } from '../components/assistant/AssistantQuickPrompts';
import { useAuth } from '../contexts/AuthContext';
import { useAssistant } from '../hooks/useAssistant';
import {
  canAskGlobalQuestions,
  canTriggerAutomations,
  getAssistantGreeting,
  isDriverAssistantMode,
} from '../lib/assistantPermissions';
import { QUICK_PROMPTS_ADMIN, QUICK_PROMPTS_DRIVER } from '../lib/assistantTypes';
import type { SuggestedAction } from '../lib/assistantTypes';
import { filterActionsForRole } from '../services/assistantEngine';
import { formatCurrency } from '../services/assistantDataService';

export function AssistantPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isError,
    error: queryError,
    sendMessage,
    createTask,
    confirmTask,
  } = useAssistant(user?.id, profile?.role, user?.email);

  const canGlobal = canAskGlobalQuestions(profile?.role, user?.email);
  const canAutomate = canTriggerAutomations(profile?.role, user?.email);
  const isDriver = isDriverAssistantMode(profile?.role, user?.email);
  const prompts = canGlobal || !isDriver ? QUICK_PROMPTS_ADMIN : QUICK_PROMPTS_DRIVER;

  const messages = data?.messages ?? [];
  const snapshot = data?.snapshot;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, sendMessage.isPending]);

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sendMessage.isPending) return;
    setError(null);
    setInput('');
    try {
      await sendMessage.mutateAsync(content);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleConfirmAction(action: SuggestedAction) {
    if (!confirm('Confirmer cette action ? Aucune modification destructive ne sera exécutée sans votre validation.')) return;
    try {
      if (action.route && !action.requiresConfirmation) {
        navigate(action.route);
        return;
      }
      await createTask.mutateAsync({
        taskType: action.type,
        title: action.title,
        description: action.description,
        payload: { route: action.route },
      });
      if (action.route) navigate(action.route);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-5 assistant-module">
        <PageHeader
          title="Assistant Z&D"
          subtitle="Intelligence & automatisations ERP"
          icon={Bot}
          badge={
            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/25">
              {canGlobal ? 'Mode admin' : isDriver ? 'Mode chauffeur' : 'Mode limité'}
            </span>
          }
        />

        {data?.migrationRequired && (
          <div className="assistant-glass rounded-xl p-4 flex items-start gap-3 border border-amber-500/25">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-200">Assistant non installé</p>
              <p className="text-xs text-white/45 mt-1">
                Exécutez <code className="text-amber-300">npx supabase db push</code> (migration 034)
              </p>
            </div>
          </div>
        )}

        {error && <FormAlert message={error} onDismiss={() => setError(null)} />}
        {isError && <FormAlert message={(queryError as { message?: string })?.message ?? 'Erreur de chargement.'} />}

        {snapshot && canGlobal && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: 'Solde', value: formatCurrency(snapshot.companyBalance) },
              { label: 'Revenus mois', value: formatCurrency(snapshot.monthlyEarnings) },
              { label: 'Feuilles attente', value: String(snapshot.pendingRoadSheets) },
              { label: 'Factures retard', value: String(snapshot.lateInvoices) },
            ].map((s, i) => (
              <div key={s.label} className="assistant-stat-card rounded-xl p-3" style={{ animationDelay: `${i * 40}ms` }}>
                <p className="text-[9px] text-white/35 uppercase">{s.label}</p>
                <p className="text-sm font-black text-white mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="assistant-glass rounded-2xl border border-white/6 flex flex-col h-[calc(100vh-280px)] min-h-[420px]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-white/30 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Chargement de l'assistant…
              </div>
            ) : (
              <>
                <AssistantMessageBubble
                  message={{
                    id: 'welcome',
                    conversation_id: '',
                    role: 'assistant',
                    content: getAssistantGreeting(profile?.role, user?.email),
                    metadata: {},
                    created_at: new Date().toISOString(),
                  }}
                />
                {messages.map(msg => (
                  <AssistantMessageBubble
                    key={msg.id}
                    message={{
                      ...msg,
                      metadata: {
                        ...msg.metadata,
                        actions: filterActionsForRole(msg.metadata?.actions ?? [], profile?.role, user?.email),
                      },
                    }}
                    canAutomate={canAutomate}
                    onConfirmAction={handleConfirmAction}
                    confirming={createTask.isPending || confirmTask.isPending}
                  />
                ))}
                {sendMessage.isPending && (
                  <div className="flex gap-3 assistant-msg-in">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="assistant-bubble-bot rounded-2xl px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                      <span className="text-sm text-white/40">Analyse en cours…</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border-t border-white/5 p-4 space-y-3">
            <AssistantQuickPrompts
              prompts={prompts}
              disabled={sendMessage.isPending || isLoading}
              onSelect={handleSend}
            />
            <form
              onSubmit={e => { e.preventDefault(); handleSend(); }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Posez votre question à l'assistant Z&D…"
                disabled={sendMessage.isPending || isLoading}
                className="flex-1 erp-input text-sm"
              />
              <button
                type="submit"
                disabled={!input.trim() || sendMessage.isPending || isLoading}
                className="btn-primary w-11 h-11 rounded-xl flex items-center justify-center disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
