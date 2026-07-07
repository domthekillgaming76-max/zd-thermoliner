import { Users, UserCheck, UserPlus, Truck, Shield, Crown, FileText, AlertTriangle, Activity } from 'lucide-react';
import type { AdminDashboardStats } from '../../lib/adminTypes';

interface AdminDashboardProps {
  stats: AdminDashboardStats;
  loading?: boolean;
}

export function AdminDashboard({ stats, loading }: AdminDashboardProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="admin-glass h-24 shimmer rounded-xl" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Utilisateurs', value: stats.totalUsers, icon: Users, accent: 'text-white' },
    { label: 'Visiteurs', value: stats.visitors, icon: UserPlus, accent: 'text-slate-300' },
    { label: 'Recrues', value: stats.recruits, icon: UserCheck, accent: 'text-white/50' },
    { label: 'Chauffeurs', value: stats.drivers, icon: Truck, accent: 'text-emerald-400' },
    { label: 'Managers', value: stats.managers, icon: Crown, accent: 'text-purple-400' },
    { label: 'Admins', value: stats.admins, icon: Shield, accent: 'text-red-400' },
    { label: 'Candidatures', value: stats.pendingApplications, icon: FileText, accent: 'text-amber-400' },
    { label: 'FDR en attente', value: stats.pendingRoadSheets, icon: FileText, accent: 'text-blue-400' },
    { label: 'Alertes sécurité', value: stats.securityAlerts, icon: AlertTriangle, accent: 'text-red-400' },
    { label: 'Actions récentes', value: stats.recentActions, icon: Activity, accent: 'text-white/60' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((c, i) => (
          <div key={c.label} className="admin-stat-card rounded-xl p-4" style={{ animationDelay: `${i * 40}ms` }}>
            <c.icon className={`w-4 h-4 mb-2 ${c.accent}`} />
            <p className="text-xl font-black text-white">{c.value}</p>
            <p className="text-[10px] text-white/35 uppercase tracking-wide mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>
      {stats.securityAlerts > 0 && (
        <div className="admin-glass rounded-xl p-4 flex items-center gap-3 border border-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-200">
            <span className="font-bold">{stats.securityAlerts}</span> tentative{stats.securityAlerts > 1 ? 's' : ''} d&apos;accès refusée{stats.securityAlerts > 1 ? 's' : ''} cette semaine
          </p>
        </div>
      )}
    </div>
  );
}
