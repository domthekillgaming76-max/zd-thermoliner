import { useEffect, useState } from 'react';
import { AppWindow, X } from 'lucide-react';
import { shouldPromptDesktopInstall } from '../lib/appMode';

const DISMISS_KEY = 'zd_desktop_app_hint_dismissed';

export function DesktopAppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!shouldPromptDesktopInstall()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] px-4 py-2 bg-[#0f0f0f]/95 border-b border-white/10 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto flex items-center gap-3 text-xs text-white/70">
        <AppWindow className="w-4 h-4 text-red-400 shrink-0" />
        <p className="flex-1">
          <span className="text-white font-semibold">Mode navigateur</span>
          {' — '}
          Installez l&apos;ERP en application (menu Edge/Chrome → Installer) pour moins de RAM et une fenêtre dédiée.
        </p>
        <button type="button" onClick={dismiss} className="text-white/40 hover:text-white p-1" aria-label="Fermer">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
