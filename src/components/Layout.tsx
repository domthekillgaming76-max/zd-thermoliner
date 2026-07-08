import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { AppHeader } from './AppHeader';
import { RoleSyncGuard } from './RoleSyncGuard';
import { OnlineMembersPanel } from './OnlineMembersPanel';
import { SidebarProvider, useSidebar } from '../contexts/SidebarContext';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

function LayoutShell({ children }: LayoutProps) {
  const { collapsed } = useSidebar();
  const { user } = useAuth();

  return (
    <RoleSyncGuard>
      <div className="min-h-screen flex erp-shell" style={{ background: '#080808' }}>
        <Sidebar />
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
            collapsed ? 'md:ml-[72px]' : 'md:ml-60'
          } lg:pr-64`}
        >
          <AppHeader />
          <MobileNav />
          <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
            <div className="max-w-[1440px] mx-auto">
              {children}
            </div>
          </main>
        </div>
        {user && <OnlineMembersPanel />}
      </div>
    </RoleSyncGuard>
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <LayoutShell>{children}</LayoutShell>
    </SidebarProvider>
  );
}
