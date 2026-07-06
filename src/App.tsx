import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Component, ReactNode } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { WallPage } from './pages/WallPage';
import { DriversPage } from './pages/DriversPage';
import { FleetPage } from './pages/FleetPage';
import { GaragesPage } from './pages/GaragesPage';
import { RoadSheetsPage } from './pages/RoadSheetsPage';
import { EconomyPage } from './pages/EconomyPage';
import { BankPage } from './pages/BankPage';
import { ProfilePage } from './pages/ProfilePage';

const queryClient = new QueryClient();

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

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={<Protected><ErrorBoundary><DashboardPage /></ErrorBoundary></Protected>} />
      <Route path="/wall" element={<Protected><ErrorBoundary><WallPage /></ErrorBoundary></Protected>} />
      <Route path="/drivers" element={<Protected><ErrorBoundary><DriversPage /></ErrorBoundary></Protected>} />
      <Route path="/fleet" element={<Protected><ErrorBoundary><FleetPage /></ErrorBoundary></Protected>} />
      <Route path="/garages" element={<Protected><ErrorBoundary><GaragesPage /></ErrorBoundary></Protected>} />
      <Route path="/road-sheets" element={<Protected><ErrorBoundary><RoadSheetsPage /></ErrorBoundary></Protected>} />
      <Route path="/economy" element={<Protected><ErrorBoundary><EconomyPage /></ErrorBoundary></Protected>} />
      <Route path="/bank" element={<Protected><ErrorBoundary><BankPage /></ErrorBoundary></Protected>} />
      <Route path="/profile" element={<Protected><ErrorBoundary><ProfilePage /></ErrorBoundary></Protected>} />
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
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
