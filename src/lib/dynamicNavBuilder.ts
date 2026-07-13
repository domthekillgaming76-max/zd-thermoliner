import type { LucideIcon } from 'lucide-react';
import type { ModuleKey } from './roleEngine';
import { resolveModuleIcon } from './moduleIcons';
import { canAccessConfiguredModule } from './moduleAccess';
import type { RoomPermission } from './roomTypes';
import { isRemovedRoomKey } from './removedRooms';
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
    meals: 'Repas',
    roles_salons: 'Rôles et salons',
  };
  return fixes[key] ?? label;
}

export function buildDynamicSidebarSections(
  role: string | null | undefined,
  email: string | null | undefined,
  rooms: RoomPermission[],
  options?: { hasUpdate?: boolean },
): NavSection[] {
  const visible = rooms
    .filter(r => !isRemovedRoomKey(r.room_key) && r.enabled && canAccessConfiguredModule(role, email, r.room_key, rooms))
    .map(r => ({
      room: r,
      category: resolveSidebarCategory(r.room_key, r.category),
      sortInCat: sortKeyInCategory(r.room_key, r.sort_order),
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
      .map(({ room: r }) => ({
        to: r.route,
        icon: resolveModuleIcon(resolveSidebarIconKey(r.room_key, r.icon)),
        label: normalizeLabel(r.room_key, r.room_name),
        module: r.room_key as ModuleKey,
        notifyDot: r.room_key === 'updates' && options?.hasUpdate,
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
  rooms: RoomPermission[],
  maxItems = 5,
): NavItem[] {
  const sections = buildDynamicSidebarSections(role, email, rooms);
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
  rooms: RoomPermission[],
): NavSection[] {
  return buildDynamicSidebarSections(role, email, rooms).filter(s =>
    ['Accueil', 'Transport', 'Entreprise', 'Finance'].includes(s.title),
  );
}
