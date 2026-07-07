import { X, Play } from 'lucide-react';
import type { TrainingLesson } from '../../lib/trainingTypes';
import { LESSON_CATEGORY_LABELS } from '../../lib/trainingTypes';

interface TrainingLessonModalProps {
  lesson: TrainingLesson | null;
  onClose: () => void;
  onComplete?: () => void;
  busy?: boolean;
}

export function TrainingLessonModal({ lesson, onClose, onComplete, busy }: TrainingLessonModalProps) {
  if (!lesson) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="training-glass rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/95 backdrop-blur z-10">
          <div>
            <p className="text-[10px] uppercase text-red-400 font-bold">{LESSON_CATEGORY_LABELS[lesson.category]}</p>
            <h2 className="font-bold text-white">{lesson.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {lesson.video_url && (
            <a href={lesson.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-cyan-400 text-sm font-semibold hover:underline">
              <Play className="w-4 h-4" />Voir la vidéo
            </a>
          )}
          <div className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{lesson.content}</div>
          {!lesson.completed && onComplete && (
            <button type="button" onClick={onComplete} disabled={busy} className="erp-btn-primary w-full py-3">
              {busy ? 'Enregistrement…' : 'Marquer comme terminé'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
