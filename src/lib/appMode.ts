/** Détecte le launcher natif Windows (WebView2). */
export function isNativeErpLauncher(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.userAgent.includes('ZDThermolinerErpLauncher');
}

/** Retourne la version annoncée par le launcher natif dans son User-Agent. */
export function getNativeErpLauncherVersion(): string | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.userAgent.match(/ZDThermolinerErpLauncher\/([0-9]+(?:\.[0-9]+){1,3})/i)?.[1] ?? null;
}

/** Détecte si l'ERP tourne en application installée (PWA), pas dans un onglet navigateur. */
export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (isNativeErpLauncher()) return true;
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: minimal-ui)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isDesktopPlatform(): boolean {
  if (typeof navigator === 'undefined') return true;
  return !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** Fenêtre navigateur classique sur PC — candidat à l'installation PWA. */
export function shouldPromptDesktopInstall(): boolean {
  return isDesktopPlatform() && !isStandaloneApp();
}

export function markStandaloneRoot(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (isStandaloneApp()) {
    root.classList.add('zd-standalone-app');
    root.dataset.appMode = 'standalone';
  } else {
    root.classList.add('zd-browser-tab');
    root.dataset.appMode = 'browser';
  }
}
