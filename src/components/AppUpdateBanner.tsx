import { Download, Sparkles } from 'lucide-react';
import { useAppUpdateNotification } from '../contexts/AppUpdateContext';

interface AppUpdateBannerProps {
  /** full = below header in layout; fixed = global top bar */
  variant?: 'full' | 'fixed' | 'compact';
}

export function AppUpdateBanner({ variant = 'full' }: AppUpdateBannerProps) {
  const {
    visible,
    title,
    message,
    buttonLabel,
    dismissLabel,
    clientVersionLabel,
    installedVersion,
    remoteVersion,
    targetVersion,
    refreshNow,
    dismissLater,
  } = useAppUpdateNotification();

  if (!visible) return null;

  const wrapperClass =
    variant === 'fixed'
      ? 'fixed top-0 left-0 right-0 z-[90] px-3 py-2.5 md:px-6'
      : variant === 'compact'
        ? 'px-4 md:px-6 py-2'
        : 'mx-4 md:mx-6 mt-3';

  return (
    <div
      className={`${wrapperClass} animate-slide-up`}
      role="status"
      aria-live="polite"
    >
      <div
        className="rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(220,38,38,0.16), rgba(127,29,29,0.1))',
          border: '1px solid rgba(239,68,68,0.32)',
          boxShadow: variant === 'fixed' ? '0 8px 32px rgba(0,0,0,0.45)' : undefined,
        }}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Sparkles className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-white/55 mt-0.5">{message}</p>
            {variant !== 'compact' && (
              <p className="text-[10px] text-white/30 mt-1">
                Version {clientVersionLabel}
                {installedVersion ? ` · installée v${installedVersion}` : ''}
                {remoteVersion ? ` · serveur v${remoteVersion}` : ''}
                {targetVersion && targetVersion !== remoteVersion ? ` · cible v${targetVersion}` : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={dismissLater}
            className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors w-full sm:w-auto"
          >
            {dismissLabel}
          </button>
          <button
            type="button"
            onClick={refreshNow}
            className="btn-primary px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 w-full sm:w-auto"
          >
            <Download className="w-3.5 h-3.5" />
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Global banner for all authenticated routes (including those without Layout). */
export function AppUpdateGlobalNotice() {
  const { visible } = useAppUpdateNotification();
  if (!visible) return null;
  return <AppUpdateBanner variant="fixed" />;
}
