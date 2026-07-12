import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Component, ReactNode, Suspense } from 'react';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppModulesProvider } from './contexts/AppModulesContext';
import { AppUpdateProvider } from './contexts/AppUpdateContext';
import { AppUpdateGlobalNotice } from './components/AppUpdateBanner';
import { LiveNotificationProvider } from './contexts/LiveNotificationContext';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { ErpLauncherBanner } from './components/ErpLauncherBanner';
import { MemberGuard } from './components/MemberGuard';
import { getPostLoginPath } from './lib/accessControl';
import { PERF } from './lib/perfConfig';
import * as Pages from './routes/lazyPages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchIntervalInBackground: false,
      staleTime: PERF.queryStaleTime,
      gcTime: PERF.queryGcTime,
    },
  },
});

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(err: Error) { console.error('[Z&D] Erreur page:', err); }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#080808' }}>
          <div className="max-w-md w-full rounded-2xl p-8 text-center"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-5xl mb-4">⚠️</p>
            <h1 className="text-xl font-bold text-white mb-2">Erreur de chargement</h1>
            <p className="text-white/50 text-sm mb-6">Une erreur inattendue s'est produite.</p>
            <a href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)' }}>
              ← Retour tableau de bord
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function PageLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/10 border-t-red-500 rounded-full animate-spin" />
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080808' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/10 border-t-red-500 rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Chargement Z&D Thermoliner...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ProtectedPage({ page, children }: { page: string; children: ReactNode }) {
  return (
    <Protected>
      <MemberGuard page={page}>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>{children}</Suspense>
        </ErrorBoundary>
      </MemberGuard>
    </Protected>
  );
}

function HomeRedirect() {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Pages.LandingPage />
      </Suspense>
    );
  }
  return <Navigate to={getPostLoginPath(profile?.role)} replace />;
}

function LoginRedirect() {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={getPostLoginPath(profile?.role)} replace />;
  return <Pages.LoginPage />;
}

function RegisterRedirect() {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={getPostLoginPath(profile?.role)} replace />;
  return <Pages.RegisterPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Suspense fallback={<PageLoader />}><LoginRedirect /></Suspense>} />
      <Route path="/register" element={<Suspense fallback={<PageLoader />}><RegisterRedirect /></Suspense>} />

      <Route path="/dashboard" element={<ProtectedPage page="dashboard"><Pages.DashboardPage /></ProtectedPage>} />
      <Route path="/wall" element={<ProtectedPage page="wall"><Pages.WallPage /></ProtectedPage>} />
      <Route path="/chat" element={<ProtectedPage page="wall"><Pages.ChatPage /></ProtectedPage>} />
      <Route path="/updates" element={<ProtectedPage page="updates"><Pages.UpdatesPage /></ProtectedPage>} />
      <Route path="/client" element={<ProtectedPage page="client_launcher"><Pages.ClientLauncherPage /></ProtectedPage>} />
      <Route path="/events" element={<ProtectedPage page="events"><Pages.EventsPage /></ProtectedPage>} />
      <Route path="/recruitment" element={<ProtectedPage page="recruitment"><Pages.RecruitmentPage /></ProtectedPage>} />
      <Route path="/recruitment/applications" element={<ProtectedPage page="recruitment_applications"><Pages.MyApplicationsPage /></ProtectedPage>} />
      <Route path="/recruitment/admin" element={<ProtectedPage page="recruitment_admin"><Pages.RecruitmentAdminPage /></ProtectedPage>} />

      <Route path="/drivers" element={<ProtectedPage page="drivers"><Pages.DriversPage /></ProtectedPage>} />
      <Route path="/drivers/:id/dossier" element={<ProtectedPage page="drivers"><Pages.DriverProfilePage /></ProtectedPage>} />
      <Route path="/drivers/:id" element={<ProtectedPage page="drivers"><Pages.DriverProfilePage /></ProtectedPage>} />
      <Route path="/fleet" element={<ProtectedPage page="fleet"><Pages.FleetPage /></ProtectedPage>} />
      <Route path="/fleet/:id" element={<ProtectedPage page="fleet"><Pages.TruckProfilePage /></ProtectedPage>} />
      <Route path="/dispatch" element={<ProtectedPage page="dispatch"><Pages.DispatchPage /></ProtectedPage>} />
      <Route path="/driver/dossier" element={<Navigate to="/driver?tab=dossier" replace />} />
      <Route path="/driver" element={<ProtectedPage page="driver_portal"><Pages.DriverPortalPage /></ProtectedPage>} />
      <Route path="/documents" element={<ProtectedPage page="documents"><Pages.DocumentsPage /></ProtectedPage>} />
      <Route path="/tracking" element={<ProtectedPage page="gps_tracking"><Pages.TrackingPage /></ProtectedPage>} />
      <Route path="/freight" element={<ProtectedPage page="freight_market"><Pages.FreightMarketPage /></ProtectedPage>} />
      <Route path="/clovis-rental" element={<ProtectedPage page="clovis_rental"><Pages.ClovisRentalPage /></ProtectedPage>} />
      <Route path="/training" element={<ProtectedPage page="training_center"><Pages.TrainingCenterPage /></ProtectedPage>} />
      <Route path="/clients" element={<ProtectedPage page="clients"><Pages.ClientsPage /></ProtectedPage>} />
      <Route path="/clients/:id" element={<ProtectedPage page="clients"><Pages.ClientProfilePage /></ProtectedPage>} />
      <Route path="/garages" element={<ProtectedPage page="garages"><Pages.GaragesPage /></ProtectedPage>} />
      <Route path="/road-sheets" element={<ProtectedPage page="road_sheets"><Pages.RoadSheetsPage /></ProtectedPage>} />
      <Route path="/finance" element={<ProtectedPage page="finance"><Pages.FinancePage /></ProtectedPage>} />
      <Route path="/invoices" element={<ProtectedPage page="invoices"><Pages.InvoicesPage /></ProtectedPage>} />
      <Route path="/salaries" element={<ProtectedPage page="salaries"><Pages.SalariesPage /></ProtectedPage>} />
      <Route path="/accounting" element={<ProtectedPage page="accounting"><Pages.AccountingPage /></ProtectedPage>} />
      <Route path="/economy" element={<Navigate to="/finance" replace />} />
      <Route path="/reports" element={<ProtectedPage page="reports"><Pages.ReportsPage /></ProtectedPage>} />
      <Route path="/bank" element={<ProtectedPage page="bank"><Pages.BankPage /></ProtectedPage>} />
      <Route path="/maintenance" element={<ProtectedPage page="maintenance"><Pages.MaintenancePage /></ProtectedPage>} />
      <Route path="/assistant" element={<ProtectedPage page="assistant"><Pages.AssistantPage /></ProtectedPage>} />
      <Route path="/fleet-map" element={<ProtectedPage page="fleet_map"><Pages.FleetMapPage /></ProtectedPage>} />
      <Route path="/statistics" element={<ProtectedPage page="statistics"><Pages.StatisticsPage /></ProtectedPage>} />
      <Route path="/notifications" element={<ProtectedPage page="notifications"><Pages.NotificationsPage /></ProtectedPage>} />
      <Route path="/administration/roles-salons" element={<ProtectedPage page="roles_salons"><Pages.RolesSalonsPage /></ProtectedPage>} />
      <Route path="/administration/salons" element={<ProtectedPage page="salons_admin"><Pages.SalonsManagementPage /></ProtectedPage>} />
      <Route path="/administration/integrations" element={<ProtectedPage page="admin_integrations"><Pages.AdminIntegrationsPage /></ProtectedPage>} />
      <Route path="/administration/rp-control" element={<ProtectedPage page="rp_control_center"><Pages.RpControlPage /></ProtectedPage>} />
      <Route path="/administration" element={<ProtectedPage page="administration"><Pages.AdminSecurityPage /></ProtectedPage>} />
      <Route path="/settings" element={<ProtectedPage page="settings"><Pages.SettingsPage /></ProtectedPage>} />
      <Route path="/profile/dossier" element={<Navigate to="/profile?tab=dossier" replace />} />
      <Route path="/profile/bank" element={<Navigate to="/profile?tab=bank" replace />} />
      <Route path="/profile/:userId" element={<ProtectedPage page="profile"><Pages.ProfilePage /></ProtectedPage>} />
      <Route path="/profile" element={<ProtectedPage page="profile"><Pages.ProfilePage /></ProtectedPage>} />
      <Route path="/integrations" element={<ProtectedPage page="driver_integrations"><Pages.DriverIntegrationsPage /></ProtectedPage>} />
      <Route path="/driver/integrations" element={<Navigate to="/integrations" replace />} />
      <Route path="/join" element={<Navigate to="/recruitment" replace />} />
      <Route path="/candidatures" element={<Navigate to="/recruitment/admin" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AppModulesProvider>
              <AppUpdateProvider>
                <LiveNotificationProvider>
                  <ErpLauncherBanner />
                  <AppUpdateGlobalNotice />
                  <AppRoutes />
                  <PwaInstallPrompt />
                </LiveNotificationProvider>
              </AppUpdateProvider>
            </AppModulesProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
