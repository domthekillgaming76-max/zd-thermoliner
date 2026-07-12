import { useEffect, useState } from 'react';
import { AppWindow, CheckCircle2, Download, HardDriveDownload, Monitor, Smartphone } from 'lucide-react';
import { getErpLauncherDownloadUrl, ERP_LAUNCHER_FILENAME } from '../lib/erpLauncher';
import { isDesktopPlatform, isNativeErpLauncher, isStandaloneApp, shouldPromptDesktopInstall } from '../lib/appMode';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

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
  const nativeLauncher = isNativeErpLauncher();
  const standalone = isStandaloneApp();
  const desktop = isDesktopPlatform();
  const ios = isIosDevice();
  const android = isAndroidDevice();
  const launcherUrl = getErpLauncherDownloadUrl();

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
              {nativeLauncher
                ? 'Launcher natif Z&D Thermoliner — processus indépendant, sans Google Chrome.'
                : 'L\'ERP tourne en mode application — moins de RAM et pas d\'onglets navigateur.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const nativeSteps = [
    'Téléchargez le launcher Windows (.exe) ci-dessous',
    `Double-cliquez sur ${ERP_LAUNCHER_FILENAME}`,
    'Si Windows affiche un avertissement : « Plus d\'infos » puis « Exécuter quand même »',
    'L\'ERP s\'ouvre dans une fenêtre dédiée (ZD-Thermoliner-ERP dans le Gestionnaire des tâches)',
    'Épinglez l\'icône à la barre des tâches ou au Bureau',
  ];

  const pwaSteps = [
    'Alternative : ouvrez Edge ou Chrome sur erp.zd-thermoliner.fr',
    'Menu ⋮ → « Installer Z&D ERP »',
    'Lancez depuis le menu Démarrer',
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

  const showNative = desktop && !ios;
  const steps = ios ? iosSteps : android && !desktop ? androidSteps : showNative ? nativeSteps : pwaSteps;
  const Icon = desktop ? Monitor : Smartphone;
  const title = variant === 'compact'
    ? 'Application ERP Windows'
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
            {showNative
              ? 'Recommandé : launcher natif — n\'apparaît pas sous Google Chrome dans le Gestionnaire des tâches.'
              : desktop
                ? 'Fenêtre dédiée sans onglets — moins de ressources sur votre PC.'
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

      {showNative && (
        <a
          href={launcherUrl}
          download
          className="btn-primary w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
        >
          <HardDriveDownload className="w-4 h-4" />
          Télécharger le launcher Windows
        </a>
      )}

      {showNative && variant === 'full' && (
        <div className="rounded-xl p-3 border border-white/8 bg-white/[0.02] space-y-2">
          <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide">Alternative PWA</p>
          {pwaSteps.map(step => (
            <p key={step} className="text-[11px] text-white/35">{step}</p>
          ))}
        </div>
      )}

      {shouldPromptDesktopInstall() && !showNative && (
        <p className="text-[11px] text-white/35 border-t border-white/5 pt-3">
          Edge : menu ⋮ → Applications → Installer ce site. Chrome : menu ⋮ → Installer Z&D ERP.
        </p>
      )}

      {deferred && !showNative && (
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
