import { lazy } from 'react';

import type { ComponentType } from 'react';

function lazyNamed<T extends Record<string, ComponentType<unknown>>>(
  factory: () => Promise<T>,
  name: keyof T,
) {
  return lazy(() => factory().then(m => ({ default: m[name] as ComponentType<unknown> })));
}

export const LoginPage = lazyNamed(() => import('../pages/LoginPage'), 'LoginPage');
export const RegisterPage = lazyNamed(() => import('../pages/RegisterPage'), 'RegisterPage');
export const LandingPage = lazyNamed(() => import('../pages/LandingPage'), 'LandingPage');
export const DashboardPage = lazyNamed(() => import('../pages/DashboardPage'), 'DashboardPage');
export const WallPage = lazyNamed(() => import('../pages/WallPage'), 'WallPage');
export const UpdatesPage = lazyNamed(() => import('../pages/UpdatesPage'), 'UpdatesPage');
export const ClientLauncherPage = lazyNamed(() => import('../pages/ClientLauncherPage'), 'ClientLauncherPage');
export const DriversPage = lazyNamed(() => import('../pages/DriversPage'), 'DriversPage');
export const DriverProfilePage = lazyNamed(() => import('../pages/DriverProfilePage'), 'DriverProfilePage');
export const FleetPage = lazyNamed(() => import('../pages/FleetPage'), 'FleetPage');
export const TruckProfilePage = lazyNamed(() => import('../pages/TruckProfilePage'), 'TruckProfilePage');
export const DispatchPage = lazyNamed(() => import('../pages/DispatchPage'), 'DispatchPage');
export const ClientsPage = lazyNamed(() => import('../pages/ClientsPage'), 'ClientsPage');
export const ClientProfilePage = lazyNamed(() => import('../pages/ClientProfilePage'), 'ClientProfilePage');
export const GaragesPage = lazyNamed(() => import('../pages/GaragesPage'), 'GaragesPage');
export const RoadSheetsPage = lazyNamed(() => import('../pages/RoadSheetsPage'), 'RoadSheetsPage');
export const FinancePage = lazyNamed(() => import('../pages/FinancePage'), 'FinancePage');
export const InvoicesPage = lazyNamed(() => import('../pages/InvoicesPage'), 'InvoicesPage');
export const SalariesPage = lazyNamed(() => import('../pages/SalariesPage'), 'SalariesPage');
export const AccountingPage = lazyNamed(() => import('../pages/AccountingPage'), 'AccountingPage');
export const FleetMapPage = lazyNamed(() => import('../pages/FleetMapPage'), 'FleetMapPage');
export const StatisticsPage = lazyNamed(() => import('../pages/StatisticsPage'), 'StatisticsPage');
export const NotificationsPage = lazyNamed(() => import('../pages/NotificationsPage'), 'NotificationsPage');
export const BankPage = lazyNamed(() => import('../pages/BankPage'), 'BankPage');
export const ProfilePage = lazyNamed(() => import('../pages/ProfilePage'), 'ProfilePage');
export const SettingsPage = lazyNamed(() => import('../pages/SettingsPage'), 'SettingsPage');
export const EventsPage = lazyNamed(() => import('../pages/EventsPage'), 'EventsPage');
export const AssistantPage = lazyNamed(() => import('../pages/AssistantPage'), 'AssistantPage');
export const ReportsPage = lazyNamed(() => import('../pages/ReportsPage'), 'ReportsPage');
export const DriverPortalPage = lazyNamed(() => import('../pages/DriverPortalPage'), 'DriverPortalPage');
export const DocumentsPage = lazyNamed(() => import('../pages/DocumentsPage'), 'DocumentsPage');
export const TrackingPage = lazyNamed(() => import('../pages/TrackingPage'), 'TrackingPage');
export const FreightMarketPage = lazyNamed(() => import('../pages/FreightMarketPage'), 'FreightMarketPage');
export const TrainingCenterPage = lazyNamed(() => import('../pages/TrainingCenterPage'), 'TrainingCenterPage');
export const MaintenancePage = lazyNamed(() => import('../pages/MaintenancePage'), 'MaintenancePage');
export const AdminSecurityPage = lazyNamed(() => import('../pages/AdminSecurityPage'), 'AdminSecurityPage');
export const SalonsManagementPage = lazyNamed(() => import('../pages/SalonsManagementPage'), 'SalonsManagementPage');
export const RolesSalonsPage = lazyNamed(() => import('../pages/RolesSalonsPage'), 'RolesSalonsPage');
export const DriverIntegrationsPage = lazyNamed(() => import('../pages/DriverIntegrationsPage'), 'DriverIntegrationsPage');
export const AdminIntegrationsPage = lazyNamed(() => import('../pages/AdminIntegrationsPage'), 'AdminIntegrationsPage');
export const RpControlPage = lazyNamed(() => import('../pages/RpControlPage'), 'RpControlPage');
export const RecruitmentPage = lazyNamed(() => import('../pages/recruitment/RecruitmentPage'), 'RecruitmentPage');
export const MyApplicationsPage = lazyNamed(() => import('../pages/recruitment/MyApplicationsPage'), 'MyApplicationsPage');
export const RecruitmentAdminPage = lazyNamed(() => import('../pages/recruitment/RecruitmentAdminPage'), 'RecruitmentAdminPage');
export const ClovisRentalPage = lazyNamed(() => import('../pages/ClovisRentalPage'), 'ClovisRentalPage');
