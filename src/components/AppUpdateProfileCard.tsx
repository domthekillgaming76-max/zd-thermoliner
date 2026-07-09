import { Download, Sparkles } from 'lucide-react';
import { useAppUpdateNotification } from '../contexts/AppUpdateContext';

export function AppUpdateProfileCard() {
  const {
    visible,
    title,
    message,
    buttonLabel,
    dismissLabel,
    clientVersionLabel,
    refreshNow,
    dismissLater,
  } = useAppUpdateNotification();

  if (!visible) return null;

  return (
    <div
      className="erp-card rounded-2xl p-5 border border-red-500/25"
      style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.08), rgba(0,0,0,0.2))' }}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-red-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-white">{title}</h2>
          <p className="text-sm text-white/55 mt-1">{message}</p>
          <p className="text-xs text-white/35 mt-2">Version {clientVersionLabel}</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <button
          type="button"
          onClick={dismissLater}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors w-full sm:w-auto text-center"
        >
          {dismissLabel}
        </button>
        <button
          type="button"
          onClick={refreshNow}
          className="btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <Download className="w-4 h-4" />
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
