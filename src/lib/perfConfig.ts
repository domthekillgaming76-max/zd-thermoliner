/**
 * Profil « éco » — réduit CPU, RAM et requêtes réseau sur PC modestes.
 * Les pages actives gardent le realtime Supabase ; le polling HTTP est espacé.
 */
export const PERF = {
  rolePollMs: 5_000,
  dashboardPollMs: 30_000,
  driversPollMs: 15_000,
  wallPollMs: 20_000,
  wallPollInBackground: false,
  freightPollMs: 30_000,
  modulesPollMs: 5_000,
  notificationPollMs: 20_000,
  presenceListPollMs: 15_000,
  driverBankPollMs: 15_000,
  telemetryPollMs: 30_000,
  liveOpsPollMs: 30_000,
  trackingPollMs: 30_000,
  statisticsPollMs: 60_000,
  backupIntervalMs: 10 * 60_000,
  queryStaleTime: 20_000,
  queryGcTime: 5 * 60_000,
} as const;
