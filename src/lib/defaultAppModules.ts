import type { AppModuleRecord } from '../services/appModuleService';
import { DEFAULT_ROOM_PERMISSIONS } from './defaultRoomPermissions';

type ModuleSeed = Omit<AppModuleRecord, 'id' | 'created_at' | 'updated_at'>;

function mod(seed: Omit<ModuleSeed, 'allowed_roles' | 'admin_only'>): ModuleSeed {
  const room = DEFAULT_ROOM_PERMISSIONS.find(r => r.room_key === seed.key);
  const roles = room?.visible_to_roles ?? ['admin'];
  return {
    ...seed,
    allowed_roles: roles,
    admin_only: room?.admin_critical ?? (!roles.includes('visiteur') && !roles.includes('chauffeur')),
  };
}

/** Fallback when Supabase app_modules is unavailable — aligné sur room_permissions */
export const DEFAULT_APP_MODULES: ModuleSeed[] = [
  mod({ key: 'dashboard', label: 'Tableau de bord', category: 'ERP', icon: 'LayoutDashboard', route: '/dashboard', enabled: true, sort_order: 10 }),
  mod({ key: 'drivers', label: 'Chauffeurs', category: 'ERP', icon: 'Users', route: '/drivers', enabled: true, sort_order: 20 }),
  mod({ key: 'fleet', label: 'Flotte', category: 'ERP', icon: 'Truck', route: '/fleet', enabled: true, sort_order: 30 }),
  mod({ key: 'garages', label: 'Garages', category: 'ERP', icon: 'Building2', route: '/garages', enabled: true, sort_order: 40 }),
  mod({ key: 'dispatch', label: 'Dispatch', category: 'ERP', icon: 'Radio', route: '/dispatch', enabled: true, sort_order: 50 }),
  mod({ key: 'freight_market', label: 'Marché Fret', category: 'ERP', icon: 'Container', route: '/freight', enabled: true, sort_order: 60 }),
  mod({ key: 'clovis_rental', label: 'Location Clovis', category: 'ERP', icon: 'KeyRound', route: '/clovis-rental', enabled: true, sort_order: 55 }),
  mod({ key: 'gps_tracking', label: 'GPS Tracking', category: 'ERP', icon: 'Map', route: '/tracking', enabled: true, sort_order: 70 }),
  mod({ key: 'fleet_map', label: 'Carte flotte', category: 'ERP', icon: 'Map', route: '/fleet-map', enabled: true, sort_order: 80 }),
  mod({ key: 'statistics', label: 'Statistiques', category: 'ERP', icon: 'FileBarChart', route: '/statistics', enabled: true, sort_order: 90 }),
  mod({ key: 'clients', label: 'Clients & Factures', category: 'ERP', icon: 'Receipt', route: '/clients', enabled: true, sort_order: 100 }),
  mod({ key: 'road_sheets', label: 'Feuilles de route', category: 'ERP', icon: 'Route', route: '/road-sheets', enabled: true, sort_order: 110 }),
  mod({ key: 'finance', label: 'Finance', category: 'ERP', icon: 'BarChart3', route: '/finance', enabled: true, sort_order: 120 }),
  mod({ key: 'invoices', label: 'Factures', category: 'ERP', icon: 'Receipt', route: '/invoices', enabled: true, sort_order: 130 }),
  mod({ key: 'salaries', label: 'Salaires', category: 'ERP', icon: 'Users', route: '/salaries', enabled: true, sort_order: 140 }),
  mod({ key: 'accounting', label: 'Comptabilité', category: 'ERP', icon: 'Calculator', route: '/accounting', enabled: true, sort_order: 150 }),
  mod({ key: 'bank', label: 'Banque', category: 'ERP', icon: 'Banknote', route: '/bank', enabled: true, sort_order: 160 }),
  mod({ key: 'maintenance', label: 'Maintenance', category: 'ERP', icon: 'Wrench', route: '/maintenance', enabled: true, sort_order: 170 }),
  mod({ key: 'reports', label: 'Rapports', category: 'ERP', icon: 'FileBarChart', route: '/reports', enabled: true, sort_order: 180 }),
  mod({ key: 'assistant', label: 'Assistant IA', category: 'ERP', icon: 'Bot', route: '/assistant', enabled: true, sort_order: 190 }),
  mod({ key: 'training_center', label: 'Formation & Règles', category: 'ERP', icon: 'GraduationCap', route: '/training', enabled: true, sort_order: 200 }),
  mod({ key: 'documents', label: 'Coffre-fort', category: 'ERP', icon: 'Archive', route: '/documents', enabled: true, sort_order: 210 }),
  mod({ key: 'driver_portal', label: 'Portail mobile', category: 'ERP', icon: 'Smartphone', route: '/driver', enabled: true, sort_order: 220 }),
  mod({ key: 'notifications', label: 'Notifications', category: 'ERP', icon: 'Bell', route: '/notifications', enabled: true, sort_order: 230 }),
  mod({ key: 'wall', label: 'Mur de la société', category: 'Communauté', icon: 'MessageSquare', route: '/wall', enabled: true, sort_order: 10 }),
  mod({ key: 'updates', label: 'Mises à jour', category: 'Communauté', icon: 'Bell', route: '/updates', enabled: true, sort_order: 20 }),
  mod({ key: 'events', label: 'Événements', category: 'Communauté', icon: 'Calendar', route: '/events', enabled: true, sort_order: 30 }),
  mod({ key: 'recruitment', label: 'Recrutement', category: 'Recrutement', icon: 'Briefcase', route: '/recruitment', enabled: true, sort_order: 10 }),
  mod({ key: 'recruitment_applications', label: 'Mes candidatures', category: 'Recrutement', icon: 'FileText', route: '/recruitment/applications', enabled: true, sort_order: 20 }),
  mod({ key: 'recruitment_admin', label: 'Toutes les candidatures', category: 'Recrutement', icon: 'Shield', route: '/recruitment/admin', enabled: true, sort_order: 30 }),
  mod({ key: 'driver_integrations', label: 'Mes intégrations', category: 'Compte', icon: 'Plug', route: '/integrations', enabled: true, sort_order: 15 }),
  mod({ key: 'profile', label: 'Profil', category: 'Compte', icon: 'User', route: '/profile', enabled: true, sort_order: 10 }),
  mod({ key: 'settings', label: 'Paramètres', category: 'Compte', icon: 'Settings', route: '/settings', enabled: true, sort_order: 20 }),
  mod({ key: 'administration', label: 'Administration', category: 'Administration', icon: 'Shield', route: '/administration', enabled: true, sort_order: 10 }),
  mod({ key: 'roles_salons', label: 'Rôles et salons', category: 'Administration', icon: 'KeyRound', route: '/administration/roles-salons', enabled: true, sort_order: 15 }),
  mod({ key: 'admin_integrations', label: 'Intégrations', category: 'Administration', icon: 'Plug', route: '/administration/integrations', enabled: true, sort_order: 15 }),
  mod({ key: 'salons_admin', label: 'Gestion des salons', category: 'Administration', icon: 'Settings', route: '/administration/salons', enabled: true, sort_order: 20 }),
];
