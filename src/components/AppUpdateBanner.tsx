import { Download, Sparkles } from 'lucide-react';
import { useAppUpdateNotification } from '../contexts/AppUpdateContext';

export function AppUpdateBanner() {
  const {
    visible, loading, title, message, buttonLabel, clientVersionLabel, refreshNow,
  } = useAppUpdateNotification();

  if (loading || !visible) return null;

  return (
    <div
      className="mx-4 md:mx-6 mt-3 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 animate-slide-up"
      style={{
        background: 'linear-gradient(135deg, rgba(220,38,38,0.14), rgba(127,29,29,0.08))',
        border: '1px solid rgba(239,68,68,0.28)',
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Sparkles className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-white/55 mt-0.5">{message}</p>
          <p className="text-[10px] text-white/30 mt-1">Version {clientVersionLabel}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={refreshNow}
        className="btn-primary px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 w-full sm:w-auto"
      >
        <Download className="w-3.5 h-3.5" />
        {buttonLabel}
      </button>
    </div>
  );
}
