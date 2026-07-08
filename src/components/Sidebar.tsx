import { NavLink } from 'react-router-dom';

import {

  LayoutDashboard, Users, Building2, Truck, Banknote,

  Route, BarChart3, LogOut, ChevronLeft, Settings, Wrench, FileBarChart,

  MessageSquare, Newspaper, Calendar, Briefcase, FileText, Shield, Radio, Receipt, Bot, Smartphone, Archive, Map, Container, GraduationCap, Calculator,

} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useAppUpdateBadge } from '../contexts/AppUpdateContext';

import { useSidebar } from '../contexts/SidebarContext';

import { isAdministratorEmail } from '../lib/admin';
import { canAccessAdministration } from '../lib/adminPermissions';

import { isVisitorRole, isDriverRole } from '../lib/accessControl';
import { canAccessBank } from '../lib/bankPermissions';

import type { LucideIcon } from 'lucide-react';



interface NavItem {

  to: string;

  icon: LucideIcon;

  label: string;

  badge?: string;

}



const MEMBER_NAV: NavItem[] = [

  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },

  { to: '/drivers', icon: Users, label: 'Chauffeurs' },

  { to: '/fleet', icon: Truck, label: 'Flotte' },

  { to: '/garages', icon: Building2, label: 'Garages' },

  { to: '/dispatch', icon: Radio, label: 'Dispatch' },

  { to: '/freight', icon: Container, label: 'Marché Fret' },

  { to: '/tracking', icon: Map, label: 'GPS Tracking' },

  { to: '/clients', icon: Receipt, label: 'Clients & Factures' },

  { to: '/road-sheets', icon: Route, label: 'Feuilles de route' },

  { to: '/finance', icon: BarChart3, label: 'Finance' },

  { to: '/invoices', icon: Receipt, label: 'Factures' },

  { to: '/salaries', icon: Users, label: 'Salaires' },

  { to: '/accounting', icon: Calculator, label: 'Comptabilité' },

  { to: '/bank', icon: Banknote, label: 'Banque' },

  { to: '/maintenance', icon: Wrench, label: 'Maintenance' },

  { to: '/reports', icon: FileBarChart, label: 'Rapports' },

  { to: '/assistant', icon: Bot, label: 'Assistant IA' },

  { to: '/training', icon: GraduationCap, label: 'Formation & Règles' },

  { to: '/documents', icon: Archive, label: 'Coffre-fort' },

];



const COMMUNITY_NAV: NavItem[] = [

  { to: '/wall', icon: MessageSquare, label: 'Mur de la société' },

  { to: '/updates', icon: Newspaper, label: 'Actualités' },

  { to: '/events', icon: Calendar, label: 'Événements' },

];



const RECRUITMENT_NAV: NavItem[] = [

  { to: '/recruitment', icon: Briefcase, label: 'Bureau du PDG' },

  { to: '/training', icon: GraduationCap, label: 'Formation & Règles' },

  { to: '/recruitment/applications', icon: FileText, label: 'Mes candidatures' },

];



function filterErpNav(items: NavItem[], role: string | undefined, email: string | undefined): NavItem[] {
  return items.filter(item => {
    if (item.to === '/bank') return canAccessBank(role, email);
    return true;
  });
}

function getNavSections(role: string | undefined, email: string | undefined) {

  const visitor = isVisitorRole(role);

  const isAdmin = isAdministratorEmail(email);
  const canAdmin = isAdmin || canAccessAdministration(role, email);



  const recruitment = [...RECRUITMENT_NAV];

  if (isAdmin) {

    recruitment.push({ to: '/recruitment/admin', icon: Shield, label: 'Toutes les candidatures' });

  }



  if (visitor) {

    return [

      { title: 'Communauté', items: COMMUNITY_NAV },

      { title: 'Recrutement', items: recruitment },

      { title: 'Compte', items: [{ to: '/settings', icon: Settings, label: 'Paramètres' }] },

    ];

  }

  if (isDriverRole(role)) {
    return [
      { title: 'Chauffeur', items: [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
        { to: '/driver', icon: Smartphone, label: 'Portail mobile' },
        { to: '/freight', icon: Container, label: 'Marché Fret' },
        { to: '/training', icon: GraduationCap, label: 'Formation' },
        { to: '/tracking', icon: Map, label: 'GPS Tracking' },
        { to: '/documents', icon: Archive, label: 'Mes documents' },
        { to: '/dispatch', icon: Radio, label: 'Missions' },
        { to: '/road-sheets', icon: Route, label: 'Feuilles de route' },
        { to: '/salaries', icon: Users, label: 'Mes salaires' },
      ]},
      { title: 'Communauté', items: COMMUNITY_NAV },
      { title: 'Recrutement', items: recruitment },
      { title: 'Compte', items: [{ to: '/settings', icon: Settings, label: 'Paramètres' }] },
    ];
  }

  const erpNav = filterErpNav(MEMBER_NAV, role, email);
  if (canAdmin) {
    erpNav.push({ to: '/administration', icon: Shield, label: 'Administration' });
  }

  return [

    { title: 'ERP', items: erpNav },

    { title: 'Communauté', items: COMMUNITY_NAV },

    { title: 'Recrutement', items: recruitment },

    { title: 'Compte', items: [{ to: '/settings', icon: Settings, label: 'Paramètres' }] },

  ];

}



export function Sidebar() {

  const { signOut, profile, user } = useAuth();

  const { collapsed, toggleCollapsed } = useSidebar();
  const hasUpdate = useAppUpdateBadge();

  const sections = getNavSections(profile?.role, user?.email ?? profile?.email);



  return (

    <aside

      className={`fixed left-0 top-0 h-full z-40 hidden md:flex flex-col transition-all duration-300 erp-sidebar ${

        collapsed ? 'w-[72px]' : 'w-60'

      }`}

    >

      <div className="flex items-center justify-end px-3 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>

        <button

          type="button"

          onClick={toggleCollapsed}

          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"

          aria-label="Réduire la barre latérale"

        >

          <ChevronLeft className={`w-4 h-4 text-white/40 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />

        </button>

      </div>



      <nav className="flex-1 overflow-y-auto py-3 px-2">

        {sections.map(section => (

          <div key={section.title} className="mb-3">

            {!collapsed && (

              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/20">

                {section.title}

              </p>

            )}

            {section.items.map(item => (

              <NavLink

                key={`${item.to}-${item.label}`}

                to={item.to}

                end={item.to === '/dashboard' || item.to === '/finance'}

                className={({ isActive }) =>

                  `sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-200 group ${

                    isActive ? 'active bg-red-500/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/[0.04]'

                  } ${collapsed ? 'justify-center' : ''}`

                }

              >

                {({ isActive }) => (

                  <>

                    <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-red-400' : 'text-white/30 group-hover:text-white/60'}`} />

                    {!collapsed && (

                      <>

                        <span className="font-medium text-sm flex-1">{item.label}</span>

                        {item.to === '/updates' && hasUpdate && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white">
                            NEW
                          </span>
                        )}

                        {item.badge && (

                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded text-white/30 bg-white/[0.04]">

                            {item.badge}

                          </span>

                        )}

                        {isActive && !item.badge && (

                          <div className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ boxShadow: '0 0 6px rgba(239,68,68,0.8)' }} />

                        )}

                      </>

                    )}

                  </>

                )}

              </NavLink>

            ))}

          </div>

        ))}

      </nav>



      <div className="border-t p-3" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>

        <button

          type="button"

          onClick={signOut}

          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}

        >

          <LogOut className="w-4 h-4 flex-shrink-0" />

          {!collapsed && <span className="font-medium text-sm">Déconnexion</span>}

        </button>

      </div>

    </aside>

  );

}


