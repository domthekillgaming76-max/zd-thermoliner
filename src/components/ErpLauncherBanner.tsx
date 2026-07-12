import { useEffect, useState } from 'react';
import { Download, HardDriveDownload, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  ERP_LAUNCHER_VERSION,
  dismissLauncherNotice,
  getErpLauncherDownloadUrl,
  markLauncherDownloaded,
  shouldShowLauncherNotice,
} from '../lib/erpLauncher';

export function ErpLauncherBanner() {
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading || !user) {
      setVisible(false);
      return;
    }
    setVisible(shouldShowLauncherNotice());
  }, [user, loading]);

  if (!visible) return null;

  const downloadUrl = getErpLauncherDownloadUrl();

  function handleDismiss() {
    dismissLauncherNotice();
    setVisible(false);
  }

  function handleDownload() {
    markLauncherDownloaded();
    setVisible(false);
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[85] px-3 py-2.5 md:px-6 animate-slide-up"
      role="status"
      aria-live="polite"
    >
      <div
        className="max-w-5xl mx-auto rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 relative"
        style={{
          background: 'linear-gradient(135deg, rgba(220,38,38,0.2), rgba(127,29,29,0.12))',
          border: '1px solid rgba(239,68,68,0.35)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        }}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <HardDriveDownload className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">
              Mise à jour Windows v{ERP_LAUNCHER_VERSION} — application ERP à installer
            </p>
            <p className="text-xs text-white/55 mt-0.5">
              Téléchargez le launcher Z&amp;D Thermoliner pour ne plus passer par Google Chrome
              (moins de RAM, processus <span className="text-white/70">ZD-Thermoliner-ERP</span>).
            </p>
            <p className="text-[10px] text-white/35 mt-1">
              Chauffeurs : guide aussi dans{' '}
              <Link to="/driver" className="text-red-400 hover:text-red-300 underline">
                Portail chauffeur
              </Link>
              {' '}ou{' '}
              <Link to="/settings" className="text-red-400 hover:text-red-300 underline">
                Paramètres → Aide
              </Link>
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            Plus tard
          </button>
          <a
            href={downloadUrl}
            download
            onClick={handleDownload}
            className="btn-primary px-4 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Télécharger l&apos;application
          </a>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-2 right-2 sm:hidden text-white/40 hover:text-white p-1"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
