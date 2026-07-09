import { safeUuid } from '../lib/safeUuid';

const TABS_KEY = 'zd_presence_tab_ids';
const TAB_ID_KEY = 'zd_tab_id';
const STALE_TAB_MS = 45_000;
function readTabs(): Record<string, number> {
  try {
    const raw = localStorage.getItem(TABS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeTabs(tabs: Record<string, number>): void {
  localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
}

function pruneStaleTabs(tabs: Record<string, number>, now = Date.now()): Record<string, number> {
  const active: Record<string, number> = {};
  for (const [id, ts] of Object.entries(tabs)) {
    if (now - ts <= STALE_TAB_MS) active[id] = ts;
  }
  return active;
}

/** Register this browser tab; returns tab id. */
export function registerPresenceTab(): string {
  let tabId = sessionStorage.getItem(TAB_ID_KEY);
  if (!tabId) {
    tabId = safeUuid();
    sessionStorage.setItem(TAB_ID_KEY, tabId);
  }
  const tabs = pruneStaleTabs(readTabs());
  tabs[tabId] = Date.now();
  writeTabs(tabs);
  return tabId;
}

/** Heartbeat for tab liveness (multi-tab support). */
export function touchPresenceTab(tabId: string): void {
  const tabs = pruneStaleTabs(readTabs());
  if (tabs[tabId]) {
    tabs[tabId] = Date.now();
    writeTabs(tabs);
  }
}

/** Unregister tab; returns remaining active tab count. */
export function unregisterPresenceTab(tabId: string): number {
  const tabs = pruneStaleTabs(readTabs());
  delete tabs[tabId];
  writeTabs(tabs);
  return Object.keys(tabs).length;
}

export function getActiveTabCount(): number {
  return Object.keys(pruneStaleTabs(readTabs())).length;
}
