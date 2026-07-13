import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { AppHeader } from './AppHeader';
import { RoleSyncGuard } from './RoleSyncGuard';
import { OnlineMembersPanel } from './OnlineMembersPanel';
import { SidebarProvider, useSidebar } from '../contexts/SidebarContext';
import { useAuth } from '../contexts/AuthContext';
import { useErpAutoBackup } from '../hooks/useErpAutoBackup';

interface LayoutProps {
  children: ReactNode;
}

function LayoutShell({ children }: LayoutProps) {
  const { collapsed } = useSidebar();
  const { user } = useAuth();
  useErpAutoBackup();

  return (
    <RoleSyncGuard>
      <div className="min-h-screen flex erp-shell relative isolate overflow-x-hidden">
        <div className="zd-app-atmosphere" aria-hidden="true">
          <span className="zd-atmosphere-cloud zd-atmosphere-cloud-one" />
          <span className="zd-atmosphere-cloud zd-atmosphere-cloud-two" />
          <span className="zd-atmosphere-red-trail zd-atmosphere-red-trail-one" />
          <span className="zd-atmosphere-red-trail zd-atmosphere-red-trail-two" />
          <span className="zd-atmosphere-light" />
        </div>
        <Sidebar />
        <div
          className={`relative z-10 flex-1 flex flex-col min-w-0 transition-all duration-300 ${
            collapsed ? 'md:ml-[82px]' : 'md:ml-[260px]'
          } 2xl:pr-64`}
        >
          <AppHeader />
          <MobileNav />
          <main className="flex-1 p-3 sm:p-4 md:p-5 xl:p-6 pb-24 md:pb-8">
            <div className="max-w-[1680px] mx-auto">
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
