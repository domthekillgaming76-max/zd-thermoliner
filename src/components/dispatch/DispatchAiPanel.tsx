import { Bot, Loader2, Sparkles, UserCheck } from 'lucide-react';
import type { DispatchAiSuggestion } from '../../lib/dispatchAiTypes';

interface DispatchAiPanelProps {
  suggestion: DispatchAiSuggestion | undefined;
  loading?: boolean;
  onApply: (driverId: string) => void;
  applying?: boolean;
}

export function DispatchAiPanel({ suggestion, loading, onApply, applying }: DispatchAiPanelProps) {
  if (loading) {
    return (
      <div className="dispatch-control-panel rounded-xl p-4 flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-red-400" />
        <span className="text-xs text-white/50">Analyse IA des chauffeurs...</span>
      </div>
    );
  }

  if (!suggestion || suggestion.rankings.length === 0) {
    return null;
  }

  const best = suggestion.rankings[0];

  return (
    <div className="dispatch-control-panel rounded-xl p-4 space-y-3 border border-red-500/15">
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-red-400" />
        <h3 className="text-xs font-bold text-red-400 uppercase">Assistant dispatch IA</h3>
        <Sparkles className="w-3 h-3 text-amber-400" />
      </div>

      <div className="erp-card rounded-xl p-3">
        <p className="text-xs text-white/50">Suggestion pour {suggestion.pickupCity}</p>
        <p className="text-sm font-bold text-white mt-1">
          {best.driverName} — score {best.score}/100
        </p>
        <ul className="mt-2 space-y-0.5">
          {best.reasons.slice(0, 3).map(r => (
            <li key={r} className="text-[10px] text-white/40">• {r}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-1.5 max-h-32 overflow-y-auto">
        {suggestion.rankings.slice(1, 4).map(r => (
          <div key={r.driverId} className="flex justify-between text-[10px] text-white/40 px-2">
            <span>{r.driverName}</span>
            <span>{r.score}/100</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={applying || !best}
        onClick={() => onApply(best.driverId)}
        className="btn-primary w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
        Attribuer automatiquement
      </button>
      <p className="text-[9px] text-white/25 text-center">Confirmation requise — pas d&apos;assignation silencieuse</p>
    </div>
  );
}
