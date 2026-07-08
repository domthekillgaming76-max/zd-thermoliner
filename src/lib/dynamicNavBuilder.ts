import type { LucideIcon } from 'lucide-react';
import type { ModuleKey } from './roleEngine';
import { resolveModuleIcon } from './moduleIcons';
import { canAccessConfiguredModule } from './moduleAccess';
import type { AppModuleRecord } from '../services/appModuleService';

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  module: ModuleKey | string;
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export function buildDynamicSidebarSections(
  role: string | null | undefined,
  email: string | null | undefined,
  modules: AppModuleRecord[],
): NavSection[] {
  const visible = modules
    .filter(m => m.enabled && canAccessConfiguredModule(role, email, m.key, modules))
    .sort((a, b) => {
      const cat = a.category.localeCompare(b.category, 'fr');
      if (cat !== 0) return cat;
      return a.sort_order - b.sort_order;
    });

  const categoryOrder: string[] = [];
  for (const m of visible) {
    if (!categoryOrder.includes(m.category)) categoryOrder.push(m.category);
  }

  return categoryOrder.map(category => ({
    title: category,
    items: visible
      .filter(m => m.category === category)
      .map(m => ({
        to: m.route,
        icon: resolveModuleIcon(m.icon),
        label: m.label,
        module: m.key as ModuleKey,
      })),
  })).filter(s => s.items.length > 0);
}

export function buildDynamicMobileNavItems(
  role: string | null | undefined,
  email: string | null | undefined,
  modules: AppModuleRecord[],
  maxItems = 5,
): NavItem[] {
  const priority = ['dashboard', 'wall', 'fleet', 'road_sheets', 'finance', 'bank', 'profile', 'driver_portal', 'freight_market'];

  const visible = modules
    .filter(m => m.enabled && canAccessConfiguredModule(role, email, m.key, modules))
    .sort((a, b) => {
      const pa = priority.indexOf(a.key);
      const pb = priority.indexOf(b.key);
      const sa = pa === -1 ? 999 : pa;
      const sb = pb === -1 ? 999 : pb;
      if (sa !== sb) return sa - sb;
      return a.sort_order - b.sort_order;
    });

  return visible.slice(0, maxItems).map(m => ({
    to: m.route,
    icon: resolveModuleIcon(m.icon),
    label: m.label.length > 12 ? m.label.split(' ')[0] : m.label,
    module: m.key as ModuleKey,
  }));
}
