import { Radio } from 'lucide-react';

interface WallLiveBadgeProps {
  isLive?: boolean;
}

export function WallLiveBadge({ isLive }: WallLiveBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
      isLive
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
        : 'border-white/10 bg-white/5 text-white/40'
    }`}>
      <span className="relative flex h-2 w-2">
        {isLive && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-emerald-400' : 'bg-white/30'}`} />
      </span>
      <Radio className="w-3 h-3" />
      {isLive ? 'En direct' : 'Connexion…'}
    </div>
  );
}

interface WallNewPostBannerProps {
  visible?: boolean;
  onDismiss: () => void;
}

export function WallNewPostBanner({ visible, onDismiss }: WallNewPostBannerProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onDismiss}
      className="w-full wall-glass rounded-xl px-4 py-3 text-sm font-semibold text-red-300 border border-red-500/25 hover:bg-red-500/10 transition-colors animate-slide-up flex items-center justify-center gap-2"
    >
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      Nouveau post reçu — cliquer pour actualiser
    </button>
  );
}
