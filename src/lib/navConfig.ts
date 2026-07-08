import {
  LayoutDashboard, Users, Building2, Truck, Banknote, Route, BarChart3, Settings, Wrench,
  FileBarChart, MessageSquare, Newspaper, Calendar, Briefcase, FileText, Shield, Radio,
  Receipt, Bot, Smartphone, Archive, Map, Container, GraduationCap, Calculator,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ModuleKey } from './roleEngine';
import { canAccessModule, getAllowedModules, normalizeRole } from './roleEngine';
import { isAdministratorEmail } from './admin';
import { canAccessAdministration } from './adminPermissions';

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
  { to: '/dispatch', icon: Radio, label: 'Dispatch', module: 'dispatch' },
  { to: '/freight', icon: Container, label: 'Marché Fret', module: 'freight_market' },
  { to: '/tracking', icon: Map, label: 'GPS Tracking', module: 'gps_tracking' },
  { to: '/fleet-map', icon: Map, label: 'Carte flotte', module: 'fleet_map' },
  { to: '/statistics', icon: FileBarChart, label: 'Statistiques', module: 'statistics' },
  { to: '/clients', icon: Receipt, label: 'Clients & Factures', module: 'clients' },
  { to: '/road-sheets', icon: Route, label: 'Feuilles de route', module: 'road_sheets' },
  { to: '/finance', icon: BarChart3, label: 'Finance', module: 'finance' },
  { to: '/invoices', icon: Receipt, label: 'Factures', module: 'invoices' },
  { to: '/salaries', icon: Users, label: 'Salaires', module: 'salaries' },
  { to: '/accounting', icon: Calculator, label: 'Comptabilité', module: 'accounting' },
  { to: '/bank', icon: Banknote, label: 'Banque', module: 'bank' },
  { to: '/maintenance', icon: Wrench, label: 'Maintenance', module: 'maintenance' },
  { to: '/reports', icon: FileBarChart, label: 'Rapports', module: 'reports' },
  { to: '/assistant', icon: Bot, label: 'Assistant IA', module: 'assistant' },
  { to: '/training', icon: GraduationCap, label: 'Formation & Règles', module: 'training_center' },
  { to: '/documents', icon: Archive, label: 'Coffre-fort', module: 'documents' },
  { to: '/driver', icon: Smartphone, label: 'Portail mobile', module: 'driver_portal' },
];

export const COMMUNITY_NAV: NavItem[] = [
  { to: '/wall', icon: MessageSquare, label: 'Mur de la société', module: 'wall' },
  { to: '/updates', icon: Newspaper, label: 'Actualités', module: 'updates' },
  { to: '/events', icon: Calendar, label: 'Événements', module: 'events' },
];

export const RECRUITMENT_NAV: NavItem[] = [
  { to: '/recruitment', icon: Briefcase, label: 'Bureau du PDG', module: 'recruitment' },
  { to: '/training', icon: GraduationCap, label: 'Formation & Règles', module: 'training_center' },
  { to: '/recruitment/applications', icon: FileText, label: 'Mes candidatures', module: 'recruitment_applications' },
];

export const ACCOUNT_NAV: NavItem[] = [
  { to: '/settings', icon: Settings, label: 'Paramètres', module: 'settings' },
];

const DRIVER_PRIORITY: ModuleKey[] = [
  'dashboard', 'driver_portal', 'freight_market', 'training_center', 'gps_tracking',
  'documents', 'dispatch', 'road_sheets', 'salaries',
];

export interface NavSection {
  title: string;
  items: NavItem[];
}

function filterByModules(items: NavItem[], role: string | null | undefined): NavItem[] {
  return items.filter(item => canAccessModule(role, item.module));
}

export function buildSidebarSections(
  role: string | null | undefined,
  email: string | null | undefined,
): NavSection[] {
  const appRole = normalizeRole(role);
  getAllowedModules(role);

  const isAdmin = isAdministratorEmail(email);
  const canAdmin = isAdmin || canAccessAdministration(role, email);

  const recruitment = filterByModules([...RECRUITMENT_NAV], role);
  if (isAdmin) {
    recruitment.push({
      to: '/recruitment/admin',
      icon: Shield,
      label: 'Toutes les candidatures',
      module: 'recruitment',
    });
  }

  const community = filterByModules(COMMUNITY_NAV, role);
  const account = filterByModules(ACCOUNT_NAV, role);

  if (appRole === 'driver') {
    const driverItems = DRIVER_PRIORITY
      .map(mod => MODULE_NAV.find(n => n.module === mod))
      .filter((n): n is NavItem => !!n && canAccessModule(role, n.module));
    return [
      { title: 'Chauffeur', items: driverItems },
      { title: 'Communauté', items: community },
      { title: 'Recrutement', items: recruitment },
      { title: 'Compte', items: account },
    ];
  }

  if (appRole === 'visitor' || appRole === 'recruit') {
    return [
      { title: 'Communauté', items: community },
      { title: 'Recrutement', items: recruitment },
      { title: 'Compte', items: account },
    ];
  }

  const erpNav = filterByModules(MODULE_NAV, role);
  if (canAdmin && canAccessModule(role, 'administration')) {
    erpNav.push({
      to: '/administration',
      icon: Shield,
      label: 'Administration',
      module: 'administration',
    });
  }

  return [
    { title: 'ERP', items: erpNav },
    { title: 'Communauté', items: community },
    { title: 'Recrutement', items: recruitment },
    { title: 'Compte', items: account },
  ];
}

export function buildMobileNavItems(
  role: string | null | undefined,
  _email?: string | null | undefined,
): NavItem[] {
  const appRole = normalizeRole(role);

  if (appRole === 'visitor' || appRole === 'recruit') {
    return filterByModules([
      { to: '/wall', icon: MessageSquare, label: 'Mur', module: 'wall' },
      { to: '/updates', icon: Newspaper, label: 'Actus', module: 'updates' },
      { to: '/events', icon: Calendar, label: 'Événements', module: 'events' },
      { to: '/recruitment', icon: Briefcase, label: 'Recrutement', module: 'recruitment' },
      { to: '/settings', icon: Settings, label: 'Compte', module: 'settings' },
    ], role);
  }

  if (appRole === 'driver') {
    return filterByModules([
      { to: '/dashboard', icon: LayoutDashboard, label: 'Accueil', module: 'dashboard' },
      { to: '/driver', icon: Smartphone, label: 'Portail', module: 'driver_portal' },
      { to: '/tracking', icon: Map, label: 'GPS', module: 'gps_tracking' },
      { to: '/dispatch', icon: Route, label: 'Missions', module: 'dispatch' },
      { to: '/wall', icon: MessageSquare, label: 'Mur', module: 'wall' },
    ], role);
  }

  const defaults: NavItem[] = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Accueil', module: 'dashboard' },
    { to: '/fleet', icon: Truck, label: 'Flotte', module: 'fleet' },
    { to: '/road-sheets', icon: Route, label: 'Routes', module: 'road_sheets' },
    { to: '/finance', icon: BarChart3, label: 'Finance', module: 'finance' },
    { to: '/bank', icon: Banknote, label: 'Banque', module: 'bank' },
  ];

  return filterByModules(defaults, role);
}
