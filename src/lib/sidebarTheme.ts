export const SIDEBAR_CATEGORY_ORDER = [
  'Accueil',
  'Transport',
  'Entreprise',
  'Finance',
  'Gestion',
  'Communauté',
  'Recrutement',
] as const;

export type SidebarCategory = typeof SIDEBAR_CATEGORY_ORDER[number];

export interface CategoryTheme {
  accent: string;
  accentSoft: string;
  iconBg: string;
  glow: string;
  border: string;
}

export const SIDEBAR_CATEGORY_THEMES: Record<SidebarCategory, CategoryTheme> = {
  Accueil: {
    accent: '#ef4444',
    accentSoft: 'rgba(239, 68, 68, 0.14)',
    iconBg: 'rgba(239, 68, 68, 0.12)',
    glow: 'rgba(239, 68, 68, 0.45)',
    border: 'rgba(239, 68, 68, 0.22)',
  },
  Transport: {
    accent: '#22d3ee',
    accentSoft: 'rgba(34, 211, 238, 0.14)',
    iconBg: 'rgba(34, 211, 238, 0.12)',
    glow: 'rgba(34, 211, 238, 0.4)',
    border: 'rgba(34, 211, 238, 0.22)',
  },
  Entreprise: {
    accent: '#fb923c',
    accentSoft: 'rgba(251, 146, 60, 0.14)',
    iconBg: 'rgba(251, 146, 60, 0.12)',
    glow: 'rgba(251, 146, 60, 0.4)',
    border: 'rgba(251, 146, 60, 0.22)',
  },
  Finance: {
    accent: '#34d399',
    accentSoft: 'rgba(52, 211, 153, 0.14)',
    iconBg: 'rgba(52, 211, 153, 0.12)',
    glow: 'rgba(52, 211, 153, 0.4)',
    border: 'rgba(245, 158, 11, 0.25)',
  },
  Gestion: {
    accent: '#a78bfa',
    accentSoft: 'rgba(167, 139, 250, 0.14)',
    iconBg: 'rgba(167, 139, 250, 0.12)',
    glow: 'rgba(167, 139, 250, 0.42)',
    border: 'rgba(167, 139, 250, 0.22)',
  },
  Communauté: {
    accent: '#f87171',
    accentSoft: 'rgba(248, 113, 113, 0.12)',
    iconBg: 'rgba(248, 113, 113, 0.1)',
    glow: 'rgba(248, 113, 113, 0.35)',
    border: 'rgba(248, 113, 113, 0.2)',
  },
  Recrutement: {
    accent: '#60a5fa',
    accentSoft: 'rgba(96, 165, 250, 0.14)',
    iconBg: 'rgba(96, 165, 250, 0.12)',
    glow: 'rgba(96, 165, 250, 0.38)',
    border: 'rgba(96, 165, 250, 0.22)',
  },
};

/** Maps module key → sidebar display category (independent of admin drag columns). */
export const MODULE_SIDEBAR_CATEGORY: Record<string, SidebarCategory> = {
  dashboard: 'Accueil',
  wall: 'Accueil',
  profile: 'Accueil',
  settings: 'Accueil',
  freight_market: 'Transport',
  road_sheets: 'Transport',
  dispatch: 'Transport',
  gps_tracking: 'Transport',
  fleet_map: 'Transport',
  driver_portal: 'Transport',
  drivers: 'Entreprise',
  fleet: 'Entreprise',
  garages: 'Entreprise',
  maintenance: 'Entreprise',
  clients: 'Entreprise',
  finance: 'Finance',
  bank: 'Finance',
  invoices: 'Finance',
  salaries: 'Finance',
  accounting: 'Finance',
  reports: 'Gestion',
  statistics: 'Gestion',
  assistant: 'Gestion',
  training_center: 'Gestion',
  documents: 'Gestion',
  administration: 'Gestion',
  salons_admin: 'Gestion',
  notifications: 'Gestion',
  updates: 'Communauté',
  events: 'Communauté',
  recruitment: 'Recrutement',
  recruitment_applications: 'Recrutement',
  recruitment_admin: 'Recrutement',
};

export const DEFAULT_MODULE_ICON_KEYS: Record<string, string> = {
  dashboard: 'LayoutDashboard',
  wall: 'MessageSquare',
  profile: 'User',
  settings: 'Settings',
  freight_market: 'Package',
  road_sheets: 'ClipboardList',
  dispatch: 'Route',
  gps_tracking: 'MapPin',
  fleet_map: 'Map',
  driver_portal: 'Smartphone',
  drivers: 'Users',
  fleet: 'Truck',
  garages: 'Warehouse',
  maintenance: 'Wrench',
  clients: 'FileText',
  finance: 'TrendingUp',
  bank: 'Landmark',
  invoices: 'Receipt',
  salaries: 'Wallet',
  accounting: 'Calculator',
  reports: 'BarChart3',
  statistics: 'PieChart',
  assistant: 'Bot',
  training_center: 'GraduationCap',
  documents: 'Shield',
  administration: 'Settings',
  salons_admin: 'Settings',
  notifications: 'Bell',
  updates: 'Bell',
  events: 'Calendar',
  recruitment: 'Briefcase',
  recruitment_applications: 'FileText',
  recruitment_admin: 'Shield',
};

const MODULE_SORT_IN_CATEGORY: Record<string, number> = {
  dashboard: 10,
  wall: 20,
  profile: 30,
  settings: 40,
  freight_market: 10,
  road_sheets: 20,
  dispatch: 30,
  gps_tracking: 40,
  fleet_map: 50,
  driver_portal: 60,
  drivers: 10,
  fleet: 20,
  garages: 30,
  maintenance: 40,
  clients: 50,
  finance: 10,
  bank: 20,
  invoices: 30,
  salaries: 40,
  accounting: 50,
  reports: 10,
  statistics: 20,
  assistant: 30,
  training_center: 40,
  documents: 50,
  administration: 60,
  salons_admin: 70,
  notifications: 80,
  updates: 10,
  events: 20,
  recruitment: 10,
  recruitment_applications: 20,
  recruitment_admin: 30,
};

export function resolveSidebarCategory(moduleKey: string, dbCategory?: string): SidebarCategory {
  if (MODULE_SIDEBAR_CATEGORY[moduleKey]) return MODULE_SIDEBAR_CATEGORY[moduleKey];
  const cat = (dbCategory ?? '').trim();
  if ((SIDEBAR_CATEGORY_ORDER as readonly string[]).includes(cat)) return cat as SidebarCategory;
  if (/accueil|compte/i.test(cat)) return 'Accueil';
  if (/transport|erp/i.test(cat)) return 'Transport';
  if (/entreprise|chauffeur/i.test(cat)) return 'Entreprise';
  if (/finance/i.test(cat)) return 'Finance';
  if (/gestion|admin/i.test(cat)) return 'Gestion';
  if (/commun/i.test(cat)) return 'Communauté';
  if (/recrut/i.test(cat)) return 'Recrutement';
  return 'Gestion';
}

export function resolveSidebarIconKey(moduleKey: string, dbIcon?: string | null): string {
  return dbIcon || DEFAULT_MODULE_ICON_KEYS[moduleKey] || 'HelpCircle';
}

export function sortKeyInCategory(moduleKey: string, sortOrder: number): number {
  return MODULE_SORT_IN_CATEGORY[moduleKey] ?? sortOrder;
}

export function getCategoryTheme(category: string): CategoryTheme {
  const key = category as SidebarCategory;
  return SIDEBAR_CATEGORY_THEMES[key] ?? SIDEBAR_CATEGORY_THEMES.Gestion;
}
