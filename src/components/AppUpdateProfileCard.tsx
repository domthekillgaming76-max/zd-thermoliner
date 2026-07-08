import { Link } from 'react-router-dom';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useAppUpdateNotification } from '../contexts/AppUpdateContext';

export function AppUpdateProfileCard() {
  const {
    visible, loading, message, serverVersion, clientVersionLabel,
    latestUpdate, dismiss, refreshNow,
  } = useAppUpdateNotification();

  if (loading || !visible) return null;

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
          <h2 className="text-sm font-bold text-white">Mise à jour disponible</h2>
          <p className="text-sm text-white/55 mt-1">{message}</p>
          <p className="text-xs text-white/35 mt-2">
            Votre version : {clientVersionLabel}
            {serverVersion ? ` · Nouvelle version : ${serverVersion}` : ''}
          </p>
          {latestUpdate?.title && (
            <p className="text-xs text-white/45 mt-1 truncate">
              {latestUpdate.title}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button
          type="button"
          onClick={refreshNow}
          className="btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Rafraîchir maintenant
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white border border-white/10 hover:bg-white/5 transition-colors"
        >
          Masquer
        </button>
        <Link
          to="/updates"
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white border border-white/10 hover:bg-white/5 transition-colors"
        >
          Voir les actualités
        </Link>
      </div>
    </div>
  );
}
