import {
  Gauge, Package, Euro, Truck, MessageCircle, Hash, Calendar, Sparkles,
  MapPin, Circle,
} from 'lucide-react';
import type { NormalizedProfile } from '../../services/profileService';
import type { ProfileCardStats } from '../../services/profileStatsService';
import { getThemeOrDefault } from '../../lib/profileThemes';

interface ProfileWidgetGridProps {
  profile: NormalizedProfile;
  stats: ProfileCardStats;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(value));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

const WIDGETS = [
  { id: 'km', icon: Gauge, label: 'Kilomètres', accent: '#22d3ee' },
  { id: 'deliveries', icon: Package, label: 'Livraisons', accent: '#fbbf24' },
  { id: 'revenue', icon: Euro, label: 'Revenus générés', accent: '#34d399' },
  { id: 'theme', icon: Truck, label: 'Thème camion', accent: '#f97316' },
  { id: 'discord', icon: MessageCircle, label: 'Discord', accent: '#818cf8' },
  { id: 'tmp', icon: Hash, label: 'TruckersMP', accent: '#a78bfa' },
  { id: 'country', icon: MapPin, label: 'Pays', accent: '#38bdf8' },
  { id: 'member', icon: Calendar, label: 'Membre depuis', accent: '#fb7185' },
] as const;

export function ProfileWidgetGrid({ profile, stats }: ProfileWidgetGridProps) {
  const theme = getThemeOrDefault(profile.profile_theme);
  const primary = profile.primary_color ?? theme.primary;

  function widgetValue(id: (typeof WIDGETS)[number]['id']): string {
    switch (id) {
      case 'km':
        return formatNumber(stats.totalKm);
      case 'deliveries':
        return formatNumber(stats.deliveries);
      case 'revenue':
        return formatCurrency(stats.revenueGenerated);
      case 'theme':
        return theme.name;
      case 'discord':
        return profile.discord_name || '—';
      case 'tmp':
        return profile.truckersmp_id || '—';
      case 'country':
        return profile.country || '—';
      case 'member':
        try {
          return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(new Date(profile.created_at));
        } catch {
          return '—';
        }
    }
  }

  return (
    <section className="profile-widget-grid">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-red-400" />
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">Widgets profil</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {WIDGETS.map((w, i) => {
          const Icon = w.icon;
          const accent = w.id === 'theme' ? primary : w.accent;
          return (
            <div
              key={w.id}
              className="profile-widget-card opacity-0 animate-dashboard-in"
              style={{
                animationDelay: `${i * 60}ms`,
                animationFillMode: 'forwards',
                ['--widget-accent' as string]: accent,
              }}
            >
              <div className="profile-widget-glow" />
              <Icon className="w-5 h-5 mb-2" style={{ color: accent }} />
              <p className="text-lg font-black text-white leading-tight">{widgetValue(w.id)}</p>
              <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wide">{w.label}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-400/80">
        <Circle className="w-2 h-2 fill-current" />
        Statut live — profil actif sur Z&amp;D Thermoliner
      </div>
    </section>
  );
}
