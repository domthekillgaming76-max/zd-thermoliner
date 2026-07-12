/** Détecte si l'ERP tourne en application installée (PWA), pas dans un onglet navigateur. */
export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
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
