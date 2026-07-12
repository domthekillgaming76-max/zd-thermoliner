import { isStandaloneApp } from './appMode';

/**
 * Profil « éco » — réduit CPU, RAM et requêtes réseau.
 * En mode application installée (PWA), les intervalles sont allongés.
 */
const STANDALONE = typeof window !== 'undefined' && isStandaloneApp();
const STANDALONE_FACTOR = STANDALONE ? 1.6 : 1;

function poll(ms: number): number {
  return Math.round(ms * STANDALONE_FACTOR);
}

export const PERF = {
  rolePollMs: poll(5_000),
  dashboardPollMs: poll(30_000),
  driversPollMs: poll(15_000),
  wallPollMs: poll(20_000),
  wallPollInBackground: false,
  freightPollMs: poll(30_000),
  modulesPollMs: poll(5_000),
  notificationPollMs: poll(20_000),
  presenceListPollMs: poll(15_000),
  driverBankPollMs: poll(15_000),
  telemetryPollMs: poll(30_000),
  liveOpsPollMs: poll(30_000),
  trackingPollMs: poll(30_000),
  statisticsPollMs: poll(60_000),
  backupIntervalMs: poll(10 * 60_000),
  queryStaleTime: poll(20_000),
  queryGcTime: 5 * 60_000,
  /** PWA installée — polling allégé côté client. */
  isStandaloneApp: STANDALONE,
} as const;

/** Retourne false pour couper le polling quand l'app est en arrière-plan. */
export function pollIntervalWhenVisible(baseMs: number, visible: boolean): number | false {
  if (!visible) return false;
  return baseMs;
}
