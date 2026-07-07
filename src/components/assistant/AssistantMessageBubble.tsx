import { Bot, User } from 'lucide-react';
import type { AiMessage } from '../../lib/assistantTypes';
import { AssistantKpiCards } from './AssistantKpiCards';
import { AssistantActionSuggestions } from './AssistantActionSuggestions';
import type { SuggestedAction } from '../../lib/assistantTypes';

interface AssistantMessageBubbleProps {
  message: AiMessage;
  canAutomate?: boolean;
  onConfirmAction?: (action: SuggestedAction) => void;
  confirming?: boolean;
}

export function AssistantMessageBubble({
  message,
  canAutomate,
  onConfirmAction,
  confirming,
}: AssistantMessageBubbleProps) {
  const isUser = message.role === 'user';
  const actions = message.metadata?.actions ?? [];
  const kpis = message.metadata?.kpis ?? [];

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} assistant-msg-in`}>
      <div
        className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${
          isUser ? 'bg-red-500/15' : 'bg-gradient-to-br from-red-600 to-red-900'
        }`}
      >
        {isUser ? <User className="w-4 h-4 text-red-400" /> : <Bot className="w-4 h-4 text-white" />}
      </div>
      <div className={`max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'assistant-bubble-user text-white'
              : 'assistant-bubble-bot text-white/85'
          }`}
        >
          <p className="whitespace-pre-line">{message.content.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
          {!isUser && kpis.length > 0 && <AssistantKpiCards kpis={kpis} />}
          {!isUser && actions.length > 0 && (
            <AssistantActionSuggestions
              actions={actions}
              canAutomate={canAutomate}
              onConfirm={onConfirmAction}
              confirming={confirming}
            />
          )}
          {message.metadata?.restricted && (
            <p className="text-[10px] text-amber-400/80 mt-2">Accès restreint — données réservées aux admins.</p>
          )}
        </div>
        <p className="text-[10px] text-white/20 mt-1 px-1">
          {new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
