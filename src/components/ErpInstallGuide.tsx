import { useEffect, useState } from 'react';
import { AppWindow, CheckCircle2, Download, Monitor, Smartphone } from 'lucide-react';
import { isDesktopPlatform, isStandaloneApp, shouldPromptDesktopInstall } from '../lib/appMode';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const ERP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://erp.zd-thermoliner.fr';

interface ErpInstallGuideProps {
  variant?: 'compact' | 'full';
  className?: string;
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

export function ErpInstallGuide({ variant = 'full', className = '' }: ErpInstallGuideProps) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const standalone = isStandaloneApp();
  const desktop = isDesktopPlatform();
  const ios = isIosDevice();
  const android = isAndroidDevice();

  useEffect(() => {
    if (standalone) return;

    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, [standalone]);

  async function handleInstall() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  if (standalone) {
    return (
      <div className={`rounded-2xl p-4 border border-emerald-500/25 bg-emerald-500/5 ${className}`}>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white">Application installée</p>
            <p className="text-xs text-white/45 mt-1">
              L&apos;ERP tourne en mode application — moins de RAM et pas d&apos;onglets navigateur.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const windowsSteps = [
    'Ouvrez Microsoft Edge (recommandé) ou Google Chrome',
    `Allez sur ${ERP_URL} et connectez-vous`,
    'Cliquez sur le menu ⋮ en haut à droite',
    desktop
      ? 'Choisissez « Installer Z&D ERP » ou « Applications → Installer ce site »'
      : 'Choisissez « Installer » ou « Ajouter à l\'écran d\'accueil »',
    'Lancez l\'ERP depuis le menu Démarrer ou l\'icône bureau',
  ];

  const iosSteps = [
    'Ouvrez Safari sur erp.zd-thermoliner.fr',
    'Connectez-vous à votre compte',
    'Appuyez sur Partager (icône carré avec flèche)',
    'Choisissez « Sur l\'écran d\'accueil »',
  ];

  const androidSteps = [
    'Ouvrez Chrome sur erp.zd-thermoliner.fr',
    'Connectez-vous à votre compte',
    'Menu ⋮ → « Installer l\'application » ou « Ajouter à l\'écran d\'accueil »',
  ];

  const steps = ios ? iosSteps : android && !desktop ? androidSteps : windowsSteps;
  const Icon = desktop ? Monitor : Smartphone;
  const title = variant === 'compact'
    ? 'Installer l\'ERP sur cet appareil'
    : 'Installer Z&D Thermoliner en application';

  const shellClass = variant === 'compact'
    ? 'driver-portal-glass rounded-2xl p-4 border border-red-500/15'
    : 'rounded-2xl p-5 border border-white/10';
  const shellStyle = variant === 'compact'
    ? undefined
    : { background: 'rgba(255,255,255,0.03)' as const };

  return (
    <div className={`${shellClass} space-y-4 ${className}`} style={shellStyle}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-red-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="text-xs text-white/45 mt-1">
            {desktop
              ? 'Fenêtre dédiée sans Chrome — consomme moins de ressources sur votre PC.'
              : 'Accès rapide depuis l\'écran d\'accueil, comme une vraie application.'}
          </p>
        </div>
        {variant === 'compact' && (
          <AppWindow className="w-5 h-5 text-white/20 shrink-0" />
        )}
      </div>

      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3 text-xs text-white/60">
            <span className="w-5 h-5 rounded-full bg-red-500/15 text-red-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
              {i + 1}
            </span>
            <span className="pt-0.5 leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>

      {shouldPromptDesktopInstall() && (
        <p className="text-[11px] text-white/35 border-t border-white/5 pt-3">
          {desktop
            ? 'Edge : menu ⋮ → Applications → Installer ce site. Chrome : menu ⋮ → Installer Z&D ERP.'
            : 'Si le bouton n\'apparaît pas, utilisez les étapes ci-dessus.'}
        </p>
      )}

      {deferred && (
        <button
          type="button"
          onClick={() => void handleInstall()}
          className="btn-primary w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Installer maintenant
        </button>
      )}
    </div>
  );
}
