import { BookOpen, CheckCircle, Clock, Play } from 'lucide-react';
import type { TrainingLesson } from '../../lib/trainingTypes';
import { LESSON_CATEGORY_LABELS } from '../../lib/trainingTypes';

interface TrainingLessonCardProps {
  lesson: TrainingLesson;
  onOpen: () => void;
  onComplete?: () => void;
  busy?: boolean;
}

export function TrainingLessonCard({ lesson, onOpen, onComplete, busy }: TrainingLessonCardProps) {
  const pct = lesson.progress_percent ?? 0;

  return (
    <article className="training-lesson-card rounded-2xl p-4 flex flex-col gap-3 training-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase text-red-400/80">
            {LESSON_CATEGORY_LABELS[lesson.category]}
          </span>
          <h3 className="font-bold text-white mt-1">{lesson.title}</h3>
          <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{lesson.description}</p>
        </div>
        {lesson.completed && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
      </div>

      <div className="flex items-center gap-3 text-[10px] text-white/35">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{lesson.duration_minutes} min</span>
        {lesson.video_url && <span className="flex items-center gap-1 text-cyan-400"><Play className="w-3 h-3" />Vidéo</span>}
      </div>

      <div className="training-progress-bar rounded-full h-1.5 overflow-hidden">
        <div className="training-progress-fill h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex gap-2 mt-auto">
        <button type="button" onClick={onOpen} className="flex-1 erp-btn-secondary text-xs py-2 flex items-center justify-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />Lire
        </button>
        {!lesson.completed && onComplete && (
          <button type="button" onClick={onComplete} disabled={busy} className="flex-1 erp-btn-primary text-xs py-2">
            Terminer
          </button>
        )}
      </div>
    </article>
  );
}
