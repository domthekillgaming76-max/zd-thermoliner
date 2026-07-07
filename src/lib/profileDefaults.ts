import type { ProfileThemeKey } from './profileThemes';
import { PROFILE_THEMES } from './profileThemes';

export const COMPANY_NAME = 'Z&D Thermoliner';

export const DEFAULT_PROFILE_THEME: ProfileThemeKey = 'scania_red';

export const DEFAULT_THEME_COLOR = 'red';

export const DEFAULT_PRIMARY_COLOR = PROFILE_THEMES.scania_red.primary;

export const DEFAULT_SECONDARY_COLOR = PROFILE_THEMES.scania_red.secondary;

/** SVG data URI — default avatar when none uploaded */
export const DEFAULT_AVATAR_URL =
  'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ef4444"/>
          <stop offset="100%" stop-color="#991b1b"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="24" fill="url(#g)"/>
      <circle cx="60" cy="46" r="22" fill="rgba(255,255,255,0.9)"/>
      <ellipse cx="60" cy="98" rx="34" ry="26" fill="rgba(255,255,255,0.85)"/>
    </svg>`,
  );

/** SVG data URI — default truck banner */
export const DEFAULT_TRUCK_BANNER_URL =
  'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#7f1d1d"/>
          <stop offset="50%" stop-color="#ef4444"/>
          <stop offset="100%" stop-color="#450a0a"/>
        </linearGradient>
      </defs>
      <rect width="800" height="200" fill="url(#bg)"/>
      <rect x="40" y="90" width="420" height="70" rx="8" fill="#1a1a1a" opacity="0.85"/>
      <rect x="470" y="70" width="200" height="90" rx="8" fill="#262626" opacity="0.9"/>
      <circle cx="130" cy="165" r="28" fill="#111"/>
      <circle cx="330" cy="165" r="28" fill="#111"/>
      <circle cx="560" cy="165" r="28" fill="#111"/>
      <text x="60" y="55" fill="white" font-family="Arial,sans-serif" font-size="28" font-weight="bold">Z&amp;D THERMOLINER</text>
    </svg>`,
  );

export function resolveAvatarUrl(url: string | null | undefined): string {
  return url?.trim() || DEFAULT_AVATAR_URL;
}

export function resolveTruckPhotoUrl(url: string | null | undefined): string | null {
  return url?.trim() || null;
}

export function resolveBannerUrl(
  url: string | null | undefined,
  themeKey?: string | null,
): string {
  if (url?.trim()) return url.trim();
  if (themeKey && themeKey in PROFILE_THEMES) {
    return PROFILE_THEMES[themeKey as ProfileThemeKey].bannerGradient;
  }
  return DEFAULT_TRUCK_BANNER_URL;
}
