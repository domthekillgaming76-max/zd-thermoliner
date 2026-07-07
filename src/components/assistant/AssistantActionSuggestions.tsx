import { ArrowRight, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SuggestedAction } from '../../lib/assistantTypes';

interface AssistantActionSuggestionsProps {
  actions: SuggestedAction[];
  canAutomate?: boolean;
  onConfirm?: (action: SuggestedAction) => void;
  confirming?: boolean;
}

export function AssistantActionSuggestions({
  actions,
  canAutomate,
  onConfirm,
  confirming,
}: AssistantActionSuggestionsProps) {
  if (!actions.length) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] font-bold uppercase text-red-400/70">Actions suggérées</p>
      {actions.map(action => (
        <div key={action.id} className="assistant-glass rounded-xl p-3 flex items-start gap-3 border border-white/5">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{action.title}</p>
            <p className="text-xs text-white/40 mt-0.5">{action.description}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {action.route && (
              <Link
                to={action.route}
                className="text-[10px] px-2.5 py-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white flex items-center gap-1"
              >
                Voir <ArrowRight className="w-3 h-3" />
              </Link>
            )}
            {action.requiresConfirmation && canAutomate && onConfirm && (
              <button
                type="button"
                disabled={confirming}
                onClick={() => onConfirm(action)}
                className="text-[10px] px-2.5 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 flex items-center gap-1 disabled:opacity-50"
              >
                <Shield className="w-3 h-3" />
                Confirmer
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
