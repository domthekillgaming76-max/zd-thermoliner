import { CheckCircle, Circle, ListChecks } from 'lucide-react';
import type { OnboardingChecklist } from '../../lib/trainingTypes';

interface TrainingOnboardingPanelProps {
  onboarding: OnboardingChecklist | null;
  rulesAccepted: boolean;
  quizPassed: boolean;
  lessonsDone: number;
  certsEarned: number;
}

export function TrainingOnboardingPanel({
  onboarding, rulesAccepted, quizPassed, lessonsDone, certsEarned,
}: TrainingOnboardingPanelProps) {
  const steps = [
    { label: 'Accepter les règles', done: rulesAccepted || !!onboarding?.rules_accepted_at },
    { label: 'Réussir le premier quiz', done: quizPassed || !!onboarding?.first_quiz_passed_at },
    { label: 'Compléter 3 leçons', done: lessonsDone >= 3 },
    { label: 'Obtenir une certification', done: certsEarned > 0 },
  ];

  const doneCount = steps.filter(s => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="training-glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <ListChecks className="w-6 h-6 text-red-400" />
        <div>
          <h3 className="font-bold text-white">Onboarding recrutement</h3>
          <p className="text-xs text-white/40">
            Statut : {onboarding?.status ?? 'non assigné'} · {pct}% complété
          </p>
        </div>
      </div>

      <div className="training-progress-bar rounded-full h-2 overflow-hidden">
        <div className="training-progress-fill h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>

      <ul className="space-y-2">
        {steps.map(step => (
          <li key={step.label} className="flex items-center gap-2 text-sm">
            {step.done
              ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              : <Circle className="w-4 h-4 text-white/20 shrink-0" />}
            <span className={step.done ? 'text-white/60 line-through' : 'text-white'}>{step.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
