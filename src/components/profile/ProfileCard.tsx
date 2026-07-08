import {
  Truck, MapPin, MessageCircle, Hash, Gauge, Package,
  Euro, Calendar, Circle, Building2,
} from 'lucide-react';
import type { NormalizedProfile } from '../../services/profileService';
import type { ProfileCardStats } from '../../services/profileStatsService';
import {
  COMPANY_NAME,
  resolveAvatarUrl,
  resolveBannerUrl,
  resolveTruckPhotoUrl,
} from '../../lib/profileDefaults';
import { RoleBadge } from '../erp/RoleBadge';
import { getThemeOrDefault } from '../../lib/profileThemes';

interface ProfileCardProps {
  profile: NormalizedProfile;
  stats: ProfileCardStats;
  isOnline?: boolean;
  /** @deprecated Role badge uses profile.role */
  isAdmin?: boolean;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(value));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

function formatMemberSince(date: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(date));
  } catch {
    return '—';
  }
}

export function ProfileCard({ profile, stats, isOnline = true }: ProfileCardProps) {
  const theme = getThemeOrDefault(profile.profile_theme);
  const primary = profile.primary_color ?? theme.primary;
  const secondary = profile.secondary_color ?? theme.secondary;
  const displayName = profile.pseudo || profile.full_name || 'Membre';
  const avatar = resolveAvatarUrl(profile.avatar_url);
  const truckPhoto = resolveTruckPhotoUrl(profile.truck_photo_url);
  const banner = resolveBannerUrl(profile.banner_url, profile.profile_theme);

  return (
    <article
      className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl profile-preview-enter"
      style={{ boxShadow: `0 20px 60px rgba(0,0,0,0.45), ${theme.glow}` }}
    >
      <div
        className="h-36 sm:h-44 relative"
        style={{
          background: banner.startsWith('linear-gradient') || banner.startsWith('data:')
            ? banner.startsWith('linear-gradient') ? banner : `url(${banner}) center/cover`
            : `url(${banner}) center/cover`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        {truckPhoto && (
          <img
            src={truckPhoto}
            alt="Camion"
            className="absolute right-4 bottom-3 w-28 h-20 object-cover rounded-xl border-2 border-white/20 shadow-lg"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span
            className="text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider backdrop-blur-md"
            style={{ borderColor: `${primary}60`, color: primary, background: `${primary}15` }}
          >
            {theme.name}
          </span>
        </div>
      </div>

      <div className="px-5 pb-5 -mt-12 relative">
        <div className="flex items-end gap-4">
          <div
            className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border-4 border-[#080808] shadow-xl"
            style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
          >
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-white truncate">{displayName}</h2>
              <RoleBadge role={profile.role} size="sm" />
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                <Circle className={`w-2 h-2 fill-current ${isOnline ? 'text-emerald-400' : 'text-white/20'}`} />
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
            {profile.full_name && profile.pseudo && (
              <p className="text-xs text-white/40 truncate">{profile.full_name}</p>
            )}
          </div>
        </div>

        {profile.bio && (
          <p className="text-sm text-white/55 mt-4 leading-relaxed">{profile.bio}</p>
        )}

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          <InfoChip icon={Building2} label="Entreprise" value={COMPANY_NAME} />
          {profile.country && <InfoChip icon={MapPin} label="Pays" value={profile.country} />}
          {profile.discord_name && <InfoChip icon={MessageCircle} label="Discord" value={profile.discord_name} />}
          {profile.truckersmp_id && <InfoChip icon={Hash} label="TruckersMP" value={profile.truckersmp_id} />}
          {profile.favorite_truck && (
            <InfoChip icon={Truck} label="Camion favori" value={profile.favorite_truck} className="sm:col-span-2" />
          )}
        </div>

        <div
          className="mt-4 grid grid-cols-3 gap-2 rounded-xl p-3 border border-white/10 bg-white/[0.03]"
          style={{ boxShadow: `inset 0 0 20px ${primary}08` }}
        >
          <StatBlock icon={Gauge} label="Kilomètres" value={formatNumber(stats.totalKm)} accent={primary} />
          <StatBlock icon={Package} label="Livraisons" value={formatNumber(stats.deliveries)} accent={primary} />
          <StatBlock icon={Euro} label="Revenus" value={formatCurrency(stats.revenueGenerated)} accent={secondary} />
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px] text-white/35">
          <Calendar className="w-3.5 h-3.5" />
          Membre depuis {formatMemberSince(profile.created_at)}
        </div>
      </div>
    </article>
  );
}

function InfoChip({
  icon: Icon,
  label,
  value,
  className = '',
}: {
  icon: typeof Truck;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-lg px-3 py-2 bg-white/[0.03] border border-white/5 ${className}`}>
      <div className="flex items-center gap-1 text-[10px] text-white/35 uppercase tracking-wide">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <p className="text-xs text-white/80 font-medium mt-0.5 truncate">{value}</p>
    </div>
  );
}

function StatBlock({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="text-center">
      <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: accent }} />
      <p className="text-sm font-black text-white">{value}</p>
      <p className="text-[10px] text-white/35">{label}</p>
    </div>
  );
}
