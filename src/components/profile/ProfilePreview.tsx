import { Truck, Shield } from 'lucide-react';
import {
  getThemeOrDefault,
  type ProfileCustomizationForm,
  type CardStyle,
  type BackgroundStyle,
} from '../../lib/profileThemes';

interface ProfilePreviewProps {
  form: ProfileCustomizationForm;
  role: string;
  email: string;
  isAdmin?: boolean;
}

function cardStyleClass(style: CardStyle): string {
  switch (style) {
    case 'solid':
      return 'bg-zinc-900/90 border border-zinc-800';
    case 'bordered':
      return 'bg-black/40 border-2';
    case 'glow':
      return 'bg-white/[0.04] border';
    default:
      return 'bg-white/[0.03] border border-white/10 backdrop-blur-xl';
  }
}

function cardStyleInline(style: CardStyle, primary: string): React.CSSProperties {
  if (style === 'bordered') return { borderColor: `${primary}50` };
  return {};
}

function previewBackground(style: BackgroundStyle, primary: string, secondary: string): React.CSSProperties {
  switch (style) {
    case 'gradient':
      return { background: `linear-gradient(160deg, ${primary}15 0%, #080808 50%, ${secondary}10 100%)` };
    case 'grid':
      return {
        background: `#0a0a0a repeating-linear-gradient(90deg, transparent, transparent 40px, ${primary}08 40px, ${primary}08 41px)`,
      };
    case 'truck':
      return {
        background: `linear-gradient(180deg, ${primary}12 0%, #050505 100%)`,
      };
    default:
      return { background: '#080808' };
  }
}

export function ProfilePreview({ form, role, email, isAdmin }: ProfilePreviewProps) {
  const theme = getThemeOrDefault(form.profile_theme);
  const primary = form.primary_color || theme.primary;
  const secondary = form.secondary_color || theme.secondary;
  const displayName = form.pseudo || form.full_name || 'Membre';
  const initial = displayName[0]?.toUpperCase() ?? '?';
  const banner = form.banner_url
    ? `url(${form.banner_url}) center/cover`
    : theme.bannerGradient;

  const cardGlow = form.card_style === 'glow' ? { boxShadow: `0 0 30px ${primary}30`, borderColor: `${primary}40` } : {};

  return (
    <div
      className="rounded-2xl overflow-hidden border border-white/10 profile-preview-enter"
      style={previewBackground(form.background_style, primary, secondary)}
    >
      <div
        className="h-28 sm:h-32 relative"
        style={{ background: banner }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        {form.truck_photo_url && (
          <img
            src={form.truck_photo_url}
            alt=""
            className="absolute right-4 bottom-2 w-20 h-14 object-cover rounded-lg border border-white/20 opacity-80"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
      </div>

      <div className="px-5 pb-5 -mt-10 relative">
        <div
          className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-black text-white border-4 border-black"
          style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, boxShadow: theme.glow }}
        >
          {form.avatar_url ? (
            <img src={form.avatar_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            initial
          )}
        </div>

        <div className="mt-3">
          <h3 className="text-lg font-black text-white">{displayName}</h3>
          {form.pseudo && form.full_name && (
            <p className="text-xs text-white/40">{form.full_name}</p>
          )}
          <p className="text-[10px] text-white/30 mt-0.5">{email}</p>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${theme.badgeClass}`}
            style={form.profile_theme === 'zd_thermoliner' ? { borderColor: `${primary}40`, color: primary } : undefined}
          >
            {theme.name}
          </span>
          {isAdmin ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 font-semibold flex items-center gap-1">
              <Shield className="w-3 h-3" /> Admin
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/50 font-medium capitalize">
              {role.replace('_', ' ')}
            </span>
          )}
        </div>

        {form.bio && (
          <p className="text-sm text-white/55 mt-3 leading-relaxed line-clamp-3">{form.bio}</p>
        )}

        <div
          className={`mt-4 rounded-xl p-4 ${cardStyleClass(form.card_style)}`}
          style={{ ...cardStyleInline(form.card_style, primary), ...cardGlow }}
        >
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {form.country && (
              <div><span className="text-white/35">Pays</span><p className="text-white/80">{form.country}</p></div>
            )}
            {form.discord_name && (
              <div><span className="text-white/35">Discord</span><p className="text-white/80">{form.discord_name}</p></div>
            )}
            {form.favorite_truck && (
              <div className="col-span-2 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" style={{ color: primary }} />
                <span className="text-white/70">{form.favorite_truck}</span>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          className="mt-4 w-full py-2 rounded-xl text-xs font-bold text-white transition-transform hover:scale-[1.02]"
          style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, boxShadow: theme.glow }}
        >
          Aperçu bouton
        </button>
      </div>
    </div>
  );
}
