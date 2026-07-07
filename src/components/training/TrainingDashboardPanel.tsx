import { BookOpen, CheckCircle, ClipboardList, Award, GraduationCap, ListChecks } from 'lucide-react';
import type { TrainingDashboard } from '../../lib/trainingTypes';

interface TrainingDashboardPanelProps {
  dashboard: TrainingDashboard;
  loading?: boolean;
}

export function TrainingDashboardPanel({ dashboard, loading }: TrainingDashboardPanelProps) {
  const cards = [
    { label: 'Règles à lire', value: dashboard.rulesToRead, icon: BookOpen, color: '#ef4444' },
    { label: 'Modules formation', value: dashboard.totalLessons, icon: GraduationCap, color: '#22d3ee' },
    { label: 'Leçons terminées', value: dashboard.completedLessons, icon: CheckCircle, color: '#10b981' },
    { label: 'Quiz en attente', value: dashboard.pendingQuizzes, icon: ClipboardList, color: '#f97316' },
    { label: 'Certifications', value: dashboard.certificationsEarned, icon: Award, color: '#fbbf24' },
    { label: 'Onboarding', value: `${dashboard.onboardingPercent}%`, icon: ListChecks, color: '#a78bfa', text: true },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map((card, i) => (
        <div key={card.label} className="training-stat-card rounded-2xl p-4" style={{ animationDelay: `${i * 40}ms` }}>
          <card.icon className="w-5 h-5 mb-2" style={{ color: card.color }} />
          <p className="text-[10px] uppercase tracking-wide text-white/40 font-semibold">{card.label}</p>
          <p className={`mt-1 font-black text-white ${card.text ? 'text-lg' : 'text-2xl'}`}>
            {loading ? '—' : card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
