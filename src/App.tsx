import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Component, ReactNode } from 'react';

import { AuthProvider, useAuth } from './contexts/AuthContext';

import { LoginPage } from './pages/LoginPage';

import { RegisterPage } from './pages/RegisterPage';

import { LandingPage } from './pages/LandingPage';

import { DashboardPage } from './pages/DashboardPage';

import { WallPage } from './pages/WallPage';

import { UpdatesPage } from './pages/UpdatesPage';

import { DriversPage } from './pages/DriversPage';

import { DriverProfilePage } from './pages/DriverProfilePage';

import { FleetPage } from './pages/FleetPage';

import { TruckProfilePage } from './pages/TruckProfilePage';

import { DispatchPage } from './pages/DispatchPage';

import { ClientsPage } from './pages/ClientsPage';

import { ClientProfilePage } from './pages/ClientProfilePage';

import { GaragesPage } from './pages/GaragesPage';

import { RoadSheetsPage } from './pages/RoadSheetsPage';

import { EconomyPage } from './pages/EconomyPage';

import { BankPage } from './pages/BankPage';

import { ProfilePage } from './pages/ProfilePage';

import { SettingsPage } from './pages/SettingsPage';

import { ModulePlaceholderPage } from './pages/ModulePlaceholderPage';

import { EventsPage } from './pages/EventsPage';

import { AssistantPage } from './pages/AssistantPage';

import { ReportsPage } from './pages/ReportsPage';

import { DriverPortalPage } from './pages/DriverPortalPage';

import { DocumentsPage } from './pages/DocumentsPage';

import { TrackingPage } from './pages/TrackingPage';

import { FreightMarketPage } from './pages/FreightMarketPage';

import { TrainingCenterPage } from './pages/TrainingCenterPage';

import { MaintenancePage } from './pages/MaintenancePage';

import { AdminSecurityPage } from './pages/AdminSecurityPage';

import { RecruitmentPage } from './pages/recruitment/RecruitmentPage';

import { MyApplicationsPage } from './pages/recruitment/MyApplicationsPage';

import { RecruitmentAdminPage } from './pages/recruitment/RecruitmentAdminPage';

import { MemberGuard } from './components/MemberGuard';

import { getPostLoginPath } from './lib/accessControl';

import { Bell } from 'lucide-react';



const queryClient = new QueryClient({

  defaultOptions: {

    queries: {

      retry: 1,

      refetchOnWindowFocus: false,

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

        <ErrorBoundary>{children}</ErrorBoundary>

      </MemberGuard>

    </Protected>

  );

}



function HomeRedirect() {

  const { user, profile, loading } = useAuth();

  if (loading) return null;

  if (!user) return <LandingPage />;

  return <Navigate to={getPostLoginPath(profile?.role)} replace />;

}



function LoginRedirect() {

  const { user, profile, loading } = useAuth();

  if (loading) return null;

  if (user) return <Navigate to={getPostLoginPath(profile?.role)} replace />;

  return <LoginPage />;

}



function RegisterRedirect() {

  const { user, profile, loading } = useAuth();

  if (loading) return null;

  if (user) return <Navigate to={getPostLoginPath(profile?.role)} replace />;

  return <RegisterPage />;

}



function AppRoutes() {

  return (

    <Routes>

      <Route path="/" element={<HomeRedirect />} />

      <Route path="/login" element={<LoginRedirect />} />

      <Route path="/register" element={<RegisterRedirect />} />



      <Route path="/dashboard" element={<ProtectedPage page="dashboard"><DashboardPage /></ProtectedPage>} />

      <Route path="/wall" element={<ProtectedPage page="wall"><WallPage /></ProtectedPage>} />

      <Route path="/updates" element={<ProtectedPage page="updates"><UpdatesPage /></ProtectedPage>} />

      <Route path="/events" element={

        <ProtectedPage page="events">

          <EventsPage />

        </ProtectedPage>

      } />

      <Route path="/recruitment" element={<ProtectedPage page="recruitment"><RecruitmentPage /></ProtectedPage>} />

      <Route path="/recruitment/applications" element={<ProtectedPage page="recruitment_applications"><MyApplicationsPage /></ProtectedPage>} />

      <Route path="/recruitment/admin" element={<ProtectedPage page="recruitment"><RecruitmentAdminPage /></ProtectedPage>} />



      <Route path="/drivers" element={<ProtectedPage page="drivers"><DriversPage /></ProtectedPage>} />

      <Route path="/drivers/:id" element={<ProtectedPage page="drivers"><DriverProfilePage /></ProtectedPage>} />

      <Route path="/fleet" element={<ProtectedPage page="fleet"><FleetPage /></ProtectedPage>} />

      <Route path="/fleet/:id" element={<ProtectedPage page="fleet"><TruckProfilePage /></ProtectedPage>} />

      <Route path="/dispatch" element={<ProtectedPage page="dispatch"><DispatchPage /></ProtectedPage>} />

      <Route path="/driver" element={

        <ProtectedPage page="driver_portal">

          <DriverPortalPage />

        </ProtectedPage>

      } />

      <Route path="/documents" element={

        <ProtectedPage page="documents">

          <DocumentsPage />

        </ProtectedPage>

      } />

      <Route path="/tracking" element={

        <ProtectedPage page="tracking">

          <TrackingPage />

        </ProtectedPage>

      } />

      <Route path="/freight" element={

        <ProtectedPage page="freight_market">

          <FreightMarketPage />

        </ProtectedPage>

      } />

      <Route path="/training" element={

        <ProtectedPage page="training_center">

          <TrainingCenterPage />

        </ProtectedPage>

      } />

      <Route path="/clients" element={<ProtectedPage page="clients"><ClientsPage /></ProtectedPage>} />

      <Route path="/clients/:id" element={<ProtectedPage page="clients"><ClientProfilePage /></ProtectedPage>} />

      <Route path="/garages" element={<ProtectedPage page="garages"><GaragesPage /></ProtectedPage>} />

      <Route path="/road-sheets" element={<ProtectedPage page="road_sheets"><RoadSheetsPage /></ProtectedPage>} />

      <Route path="/finance" element={<ProtectedPage page="economy"><EconomyPage /></ProtectedPage>} />

      <Route path="/economy" element={<Navigate to="/finance" replace />} />

      <Route path="/reports" element={

        <ProtectedPage page="reports">

          <ReportsPage />

        </ProtectedPage>

      } />

      <Route path="/bank" element={<ProtectedPage page="bank"><BankPage /></ProtectedPage>} />

      <Route path="/maintenance" element={

        <ProtectedPage page="maintenance">

          <MaintenancePage />

        </ProtectedPage>

      } />

      <Route path="/assistant" element={

        <ProtectedPage page="assistant">

          <AssistantPage />

        </ProtectedPage>

      } />

      <Route path="/notifications" element={

        <ProtectedPage page="notifications">

          <ModulePlaceholderPage title="Notifications" description="Centre de notifications et alertes système" icon={Bell} />

        </ProtectedPage>

      } />

      <Route path="/administration" element={

        <ProtectedPage page="administration">

          <AdminSecurityPage />

        </ProtectedPage>

      } />

      <Route path="/settings" element={<ProtectedPage page="settings"><SettingsPage /></ProtectedPage>} />

      <Route path="/profile" element={<ProtectedPage page="profile"><ProfilePage /></ProtectedPage>} />



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

            <AppRoutes />

          </AuthProvider>

        </BrowserRouter>

      </QueryClientProvider>

    </ErrorBoundary>

  );

}



export default App;
