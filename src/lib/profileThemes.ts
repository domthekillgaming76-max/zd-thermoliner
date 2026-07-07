export type ProfileThemeKey =
  | 'scania_red'
  | 'volvo_blue'
  | 'man_dark'
  | 'daf_gold'
  | 'renault_racing'
  | 'mercedes_silver'
  | 'zd_thermoliner'
  | 'credit_agricole';

export type BackgroundStyle = 'dark' | 'gradient' | 'grid' | 'truck';
export type CardStyle = 'glass' | 'solid' | 'bordered' | 'glow';

export interface ProfileTheme {
  key: ProfileThemeKey;
  name: string;
  primary: string;
  secondary: string;
  bannerGradient: string;
  glow: string;
  badgeClass: string;
}

export const PROFILE_THEMES: Record<ProfileThemeKey, ProfileTheme> = {
  scania_red: {
    key: 'scania_red',
    name: 'Scania Red Edition',
    primary: '#ef4444',
    secondary: '#991b1b',
    bannerGradient: 'linear-gradient(135deg, #7f1d1d 0%, #ef4444 50%, #450a0a 100%)',
    glow: '0 0 24px rgba(239, 68, 68, 0.35)',
    badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  volvo_blue: {
    key: 'volvo_blue',
    name: 'Volvo Blue Ice',
    primary: '#3b82f6',
    secondary: '#1e3a8a',
    bannerGradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #0c4a6e 100%)',
    glow: '0 0 24px rgba(59, 130, 246, 0.35)',
    badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  man_dark: {
    key: 'man_dark',
    name: 'MAN Dark Premium',
    primary: '#a3a3a3',
    secondary: '#262626',
    bannerGradient: 'linear-gradient(135deg, #0a0a0a 0%, #404040 50%, #171717 100%)',
    glow: '0 0 24px rgba(163, 163, 163, 0.2)',
    badgeClass: 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30',
  },
  daf_gold: {
    key: 'daf_gold',
    name: 'DAF Gold Line',
    primary: '#eab308',
    secondary: '#854d0e',
    bannerGradient: 'linear-gradient(135deg, #854d0e 0%, #eab308 50%, #422006 100%)',
    glow: '0 0 24px rgba(234, 179, 8, 0.3)',
    badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  renault_racing: {
    key: 'renault_racing',
    name: 'Renault Racing',
    primary: '#facc15',
    secondary: '#ca8a04',
    bannerGradient: 'linear-gradient(135deg, #ca8a04 0%, #fef08a 40%, #713f12 100%)',
    glow: '0 0 24px rgba(250, 204, 21, 0.3)',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  mercedes_silver: {
    key: 'mercedes_silver',
    name: 'Mercedes Silver',
    primary: '#d4d4d8',
    secondary: '#71717a',
    bannerGradient: 'linear-gradient(135deg, #27272a 0%, #d4d4d8 50%, #18181b 100%)',
    glow: '0 0 24px rgba(212, 212, 216, 0.25)',
    badgeClass: 'bg-zinc-400/20 text-zinc-300 border-zinc-400/30',
  },
  zd_thermoliner: {
    key: 'zd_thermoliner',
    name: 'Z&D Thermoliner Black/Red',
    primary: '#ef4444',
    secondary: '#14b8a6',
    bannerGradient: 'linear-gradient(135deg, #0a0a0a 0%, #b91c1c 45%, #0f766e 100%)',
    glow: '0 0 28px rgba(239, 68, 68, 0.35), 0 0 40px rgba(20, 184, 166, 0.15)',
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/25',
  },
  credit_agricole: {
    key: 'credit_agricole',
    name: 'Crédit Agricole Green',
    primary: '#22c55e',
    secondary: '#14532d',
    bannerGradient: 'linear-gradient(135deg, #14532d 0%, #22c55e 50%, #052e16 100%)',
    glow: '0 0 24px rgba(34, 197, 94, 0.3)',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
};

export const BACKGROUND_STYLES: { key: BackgroundStyle; label: string }[] = [
  { key: 'dark', label: 'Sombre' },
  { key: 'gradient', label: 'Dégradé' },
  { key: 'grid', label: 'Grille' },
  { key: 'truck', label: 'Route' },
];

export const CARD_STYLES: { key: CardStyle; label: string }[] = [
  { key: 'glass', label: 'Verre' },
  { key: 'solid', label: 'Solide' },
  { key: 'bordered', label: 'Bordure' },
  { key: 'glow', label: 'Lueur' },
];

export interface ProfileCustomizationForm {
  full_name: string;
  pseudo: string;
  bio: string;
  country: string;
  discord_name: string;
  truckersmp_id: string;
  favorite_truck: string;
  favorite_trailer: string;
  avatar_url: string;
  banner_url: string;
  profile_theme: ProfileThemeKey;
  primary_color: string;
  secondary_color: string;
  background_style: BackgroundStyle;
  card_style: CardStyle;
  truck_photo_url: string;
}

export function getThemeOrDefault(key: string | null | undefined): ProfileTheme {
  if (key && key in PROFILE_THEMES) {
    return PROFILE_THEMES[key as ProfileThemeKey];
  }
  return PROFILE_THEMES.scania_red;
}

export function profileToForm(profile: {
  full_name?: string;
  pseudo?: string | null;
  bio?: string | null;
  country?: string | null;
  discord_name?: string | null;
  truckersmp_id?: string | null;
  favorite_truck?: string | null;
  favorite_trailer?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  profile_theme?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  background_style?: string | null;
  card_style?: string | null;
  truck_photo_url?: string | null;
  theme_color?: string | null;
} | null): ProfileCustomizationForm {
  const theme = getThemeOrDefault(profile?.profile_theme ?? undefined);
  return {
    full_name: profile?.full_name ?? '',
    pseudo: profile?.pseudo ?? '',
    bio: profile?.bio ?? '',
    country: profile?.country ?? '',
    discord_name: profile?.discord_name ?? '',
    truckersmp_id: profile?.truckersmp_id ?? '',
    favorite_truck: profile?.favorite_truck ?? '',
    favorite_trailer: profile?.favorite_trailer ?? '',
    avatar_url: profile?.avatar_url ?? '',
    banner_url: profile?.banner_url ?? '',
    profile_theme: theme.key,
    primary_color: profile?.primary_color ?? theme.primary,
    secondary_color: profile?.secondary_color ?? theme.secondary,
    background_style: (profile?.background_style as BackgroundStyle) ?? 'dark',
    card_style: (profile?.card_style as CardStyle) ?? 'glass',
    truck_photo_url: profile?.truck_photo_url ?? '',
  };
}

export function applyThemeToForm(
  form: ProfileCustomizationForm,
  themeKey: ProfileThemeKey,
): ProfileCustomizationForm {
  const theme = PROFILE_THEMES[themeKey];
  return {
    ...form,
    profile_theme: themeKey,
    primary_color: theme.primary,
    secondary_color: theme.secondary,
  };
}
