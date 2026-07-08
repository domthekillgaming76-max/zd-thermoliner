import type { LucideIcon } from 'lucide-react';
import type { ModuleKey } from './roleEngine';
import { resolveModuleIcon } from './moduleIcons';
import { canAccessConfiguredModule } from './moduleAccess';
import type { AppModuleRecord } from '../services/appModuleService';
import {
  SIDEBAR_CATEGORY_ORDER,
  getCategoryTheme,
  resolveSidebarCategory,
  resolveSidebarIconKey,
  sortKeyInCategory,
  type CategoryTheme,
} from './sidebarTheme';

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  module: ModuleKey | string;
  badge?: string;
  notifyDot?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
  theme: CategoryTheme;
}

function normalizeLabel(key: string, label: string): string {
  const fixes: Record<string, string> = {
    wall: 'Mur société',
    freight_market: 'Marché Fret',
    road_sheets: 'Feuilles de route',
    gps_tracking: 'GPS Tracking',
    fleet_map: 'Carte flotte',
    training_center: 'Formation & Règles',
    documents: 'Coffre-fort',
    driver_portal: 'Portail chauffeur',
  };
  return fixes[key] ?? label;
}

export function buildDynamicSidebarSections(
  role: string | null | undefined,
  email: string | null | undefined,
  modules: AppModuleRecord[],
  options?: { hasUpdate?: boolean },
): NavSection[] {
  const visible = modules
    .filter(m => m.enabled && canAccessConfiguredModule(role, email, m.key, modules))
    .map(m => ({
      module: m,
      category: resolveSidebarCategory(m.key, m.category),
      sortInCat: sortKeyInCategory(m.key, m.sort_order),
    }))
    .sort((a, b) => {
      const catA = SIDEBAR_CATEGORY_ORDER.indexOf(a.category);
      const catB = SIDEBAR_CATEGORY_ORDER.indexOf(b.category);
      const ca = catA === -1 ? 999 : catA;
      const cb = catB === -1 ? 999 : catB;
      if (ca !== cb) return ca - cb;
      return a.sortInCat - b.sortInCat;
    });

  const sections: NavSection[] = [];

  for (const cat of SIDEBAR_CATEGORY_ORDER) {
    const items = visible
      .filter(v => v.category === cat)
      .map(({ module: m }) => ({
        to: m.route,
        icon: resolveModuleIcon(resolveSidebarIconKey(m.key, m.icon)),
        label: normalizeLabel(m.key, m.label),
        module: m.key as ModuleKey,
        notifyDot: m.key === 'updates' && options?.hasUpdate,
      }));

    if (items.length > 0) {
      sections.push({
        title: cat,
        items,
        theme: getCategoryTheme(cat),
      });
    }
  }

  return sections;
}

export function buildDynamicMobileNavItems(
  role: string | null | undefined,
  email: string | null | undefined,
  modules: AppModuleRecord[],
  maxItems = 5,
): NavItem[] {
  const sections = buildDynamicSidebarSections(role, email, modules);
  const flat = sections.flatMap(s =>
    s.items.map(item => ({ ...item, theme: s.theme })),
  );

  const priority = ['dashboard', 'wall', 'freight_market', 'road_sheets', 'fleet', 'profile', 'finance'];

  flat.sort((a, b) => {
    const pa = priority.indexOf(String(a.module));
    const pb = priority.indexOf(String(b.module));
    const sa = pa === -1 ? 999 : pa;
    const sb = pb === -1 ? 999 : pb;
    return sa - sb;
  });

  return flat.slice(0, maxItems).map(({ theme: _t, ...item }) => ({
    ...item,
    label: item.label.length > 10 ? item.label.split(' ')[0] : item.label,
  }));
}

export function buildMobileNavSections(
  role: string | null | undefined,
  email: string | null | undefined,
  modules: AppModuleRecord[],
): NavSection[] {
  return buildDynamicSidebarSections(role, email, modules).filter(s =>
    ['Accueil', 'Transport', 'Entreprise', 'Finance'].includes(s.title),
  );
}
