import { useState } from 'react';
import { ChevronDown, ChevronRight, Shield } from 'lucide-react';
import type { RulesSection } from '../../lib/trainingTypes';

interface TrainingRulesPanelProps {
  rules: RulesSection[];
  rulesAccepted: boolean;
  onAccept?: () => void;
  accepting?: boolean;
}

export function TrainingRulesPanel({ rules, rulesAccepted, onAccept, accepting }: TrainingRulesPanelProps) {
  const [open, setOpen] = useState<string | null>(rules[0]?.id ?? null);

  return (
    <div className="space-y-3">
      {rules.map(rule => {
        const isOpen = open === rule.id;
        return (
          <div key={rule.id} className="training-glass rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : rule.id)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors"
            >
              <Shield className="w-5 h-5 text-red-400 shrink-0" />
              <span className="font-bold text-white flex-1">{rule.title}</span>
              {isOpen ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
            </button>
            {isOpen && (
              <div className="px-4 pb-4 border-t border-white/5">
                <div className="prose prose-invert prose-sm max-w-none mt-3 text-white/70 whitespace-pre-wrap text-sm leading-relaxed">
                  {rule.content}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {!rulesAccepted && onAccept && (
        <button
          type="button"
          onClick={onAccept}
          disabled={accepting}
          className="erp-btn-primary w-full py-3 text-sm font-bold"
        >
          {accepting ? 'Enregistrement…' : 'J\'ai lu et j\'accepte les règles Z&D'}
        </button>
      )}
      {rulesAccepted && (
        <p className="text-center text-xs text-emerald-400 font-semibold">✓ Règles acceptées</p>
      )}
    </div>
  );
}
