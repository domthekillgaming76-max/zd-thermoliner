import {
  LayoutDashboard, Users, Building2, Truck, Banknote, Route, BarChart3, Wrench,
  FileBarChart, MessageSquare, Briefcase, FileText,
  Receipt, Bot, Archive, Container, GraduationCap, Calculator, User, Utensils,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ModuleKey } from './roleEngine';
import { DEFAULT_ROOM_PERMISSIONS } from './defaultRoomPermissions';
import { buildDynamicSidebarSections, buildDynamicMobileNavItems } from './dynamicNavBuilder';
import type { RoomPermission } from './roomTypes';

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  module: ModuleKey;
  badge?: string;
}

export const MODULE_NAV: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', module: 'dashboard' },
  { to: '/drivers', icon: Users, label: 'Chauffeurs', module: 'drivers' },
  { to: '/fleet', icon: Truck, label: 'Flotte', module: 'fleet' },
  { to: '/garages', icon: Building2, label: 'Garages', module: 'garages' },
  { to: '/freight', icon: Container, label: 'Marché Fret', module: 'freight_market' },
  { to: '/meals', icon: Utensils, label: 'Repas', module: 'meals' },
  { to: '/statistics', icon: FileBarChart, label: 'Statistiques', module: 'statistics' },
  { to: '/clients', icon: Receipt, label: 'Clients & Factures', module: 'clients' },
  { to: '/road-sheets', icon: Route, label: 'Feuilles de route', module: 'road_sheets' },
  { to: '/finance', icon: BarChart3, label: 'Finance', module: 'finance' },
  { to: '/salaries', icon: Users, label: 'Salaires', module: 'salaries' },
  { to: '/accounting', icon: Calculator, label: 'Comptabilité', module: 'accounting' },
  { to: '/bank', icon: Banknote, label: 'Banque', module: 'bank' },
  { to: '/maintenance', icon: Wrench, label: 'Maintenance', module: 'maintenance' },
  { to: '/reports', icon: FileBarChart, label: 'Rapports', module: 'reports' },
  { to: '/assistant', icon: Bot, label: 'Assistant IA', module: 'assistant' },
  { to: '/training', icon: GraduationCap, label: 'Formation & Règles', module: 'training_center' },
  { to: '/documents', icon: Archive, label: 'Coffre-fort', module: 'documents' },
];

export const PROFILE_NAV: NavItem = {
  to: '/profile', icon: User, label: 'Profil', module: 'profile',
};

export const WALL_NAV: NavItem = {
  to: '/wall', icon: MessageSquare, label: 'Mur de la société', module: 'wall',
};

export const RECRUITMENT_NAV: NavItem[] = [
  { to: '/recruitment', icon: Briefcase, label: 'Recrutement', module: 'recruitment' },
  { to: '/recruitment/applications', icon: FileText, label: 'Mes candidatures', module: 'recruitment_applications' },
];

export interface NavSection {
  title: string;
  items: NavItem[];
}

function fallbackRooms(): RoomPermission[] {
  const now = new Date().toISOString();
  return DEFAULT_ROOM_PERMISSIONS.map((r, i) => ({
    ...r,
    id: `default-${r.room_key}`,
    sort_order: r.sort_order ?? i * 10,
    created_at: now,
    updated_at: now,
  }));
}

export function buildSidebarSections(
  role: string | null | undefined,
  email: string | null | undefined,
) {
  return buildDynamicSidebarSections(role, email, fallbackRooms());
}

export function buildMobileNavItems(
  role: string | null | undefined,
  email?: string | null | undefined,
): NavItem[] {
  return buildDynamicMobileNavItems(role, email, fallbackRooms()).map(item => ({
    ...item,
    module: item.module as ModuleKey,
  }));
}
