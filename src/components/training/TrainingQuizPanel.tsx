import { useEffect, useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import type { TrainingQuestion, TrainingQuiz } from '../../lib/trainingTypes';

interface TrainingQuizPanelProps {
  quiz: TrainingQuiz | null;
  questions: TrainingQuestion[];
  loading?: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (answers: Record<string, string>) => void;
  result?: { score: number; passed: boolean; certification?: string } | null;
}

export function TrainingQuizPanel({
  quiz, questions, loading, submitting, onClose, onSubmit, result,
}: TrainingQuizPanelProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (quiz) setAnswers({});
  }, [quiz?.id]);

  if (!quiz) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="training-glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/95 backdrop-blur">
          <div>
            <h2 className="font-bold text-white">{quiz.title}</h2>
            <p className="text-xs text-white/40">Score min. {quiz.min_score}% · {quiz.attempts_used ?? 0}/{quiz.max_attempts} tentatives</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {result ? (
            <div className={`rounded-2xl p-6 text-center ${result.passed ? 'bg-emerald-500/10 border border-emerald-500/25' : 'bg-red-500/10 border border-red-500/25'}`}>
              <p className="text-3xl font-black text-white">{result.score}%</p>
              <p className={`font-bold mt-2 ${result.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.passed ? 'Quiz réussi !' : 'Quiz échoué'}
              </p>
              {result.certification && (
                <p className="text-xs text-amber-400 mt-2">Certification débloquée</p>
              )}
              <button type="button" onClick={onClose} className="erp-btn-primary mt-4 w-full">Fermer</button>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-white/30" /></div>
          ) : (
            <>
              {questions.map((q, i) => (
                <div key={q.id} className="space-y-2">
                  <p className="text-sm font-semibold text-white">{i + 1}. {q.question_text}</p>
                  {q.question_type === 'true_false' ? (
                    <div className="flex gap-2">
                      {['true', 'false'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAnswers(a => ({ ...a, [q.id]: val }))}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                            answers[q.id] === val
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : 'bg-white/5 text-white/40 border-white/8'
                          }`}
                        >
                          {val === 'true' ? 'Vrai' : 'Faux'}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {q.options.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            answers[q.id] === opt
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : 'bg-white/5 text-white/50 border-white/8'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                disabled={submitting || questions.some(q => !answers[q.id])}
                onClick={() => onSubmit(answers)}
                className="erp-btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Soumettre le quiz
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
