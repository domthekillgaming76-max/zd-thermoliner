import { useEffect, useState } from 'react';
import { Download, Monitor, Smartphone, X } from 'lucide-react';
import { isDesktopPlatform, shouldPromptDesktopInstall } from '../lib/appMode';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'zd_pwa_install_dismissed';

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (!shouldPromptDesktopInstall()) {
      const ua = navigator.userAgent;
      const ios = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
      setIsIos(ios);
      if (ios && !(navigator as Navigator & { standalone?: boolean }).standalone) {
        setVisible(true);
      }
      return;
    }

    setIsDesktop(isDesktopPlatform());

    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  async function handleInstall() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setVisible(false);
      setDeferred(null);
      return;
    }
    setVisible(false);
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  const Icon = isDesktop ? Monitor : Smartphone;
  const title = isDesktop
    ? 'Installer l\'ERP sur Windows'
    : 'Installer Z&D Thermoliner ERP';

  const description = isIos
    ? 'Sur iPhone : Partager → « Sur l\'écran d\'accueil »'
    : isDesktop
      ? deferred
        ? 'Application légère sans onglets Chrome — moins de RAM et de CPU.'
        : 'Edge ou Chrome : menu ⋮ → « Installer Z&D ERP » ou « Applications → Installer ».'
      : 'Accédez à l\'ERP comme une application mobile.';

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 erp-card rounded-2xl p-4 border border-red-500/20 shadow-2xl animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-red-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="text-xs text-white/45 mt-1">{description}</p>
          <div className="flex gap-2 mt-3">
            {(deferred && !isIos) && (
              <button
                type="button"
                onClick={handleInstall}
                className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Installer
              </button>
            )}
            <button type="button" onClick={handleDismiss} className="text-xs text-white/40 hover:text-white/60 px-2">
              Plus tard
            </button>
          </div>
        </div>
        <button type="button" onClick={handleDismiss} className="text-white/30 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
