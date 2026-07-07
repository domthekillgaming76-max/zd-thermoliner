import { Radio, Plug, Circle } from 'lucide-react';
import { TRACKING_PROVIDERS } from '../../lib/trackingProviders';

export function TrackingProvidersBar() {
  const active = TRACKING_PROVIDERS.filter(p => p.enabled);
  const upcoming = TRACKING_PROVIDERS.filter(p => !p.enabled);

  return (
    <div className="tracking-glass rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
      <div className="flex items-center gap-2 shrink-0">
        <Plug className="w-4 h-4 text-red-400" />
        <span className="text-xs font-bold text-white/70 uppercase tracking-wide">Sources GPS</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {active.map(p => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-provider-active"
          >
            <Radio className="w-3 h-3" />
            {p.label}
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </span>
        ))}
      </div>

      {upcoming.length > 0 && (
        <>
          <div className="hidden sm:block w-px h-6 bg-white/10" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-white/30 uppercase tracking-wider mr-1">À venir</span>
            {upcoming.map(p => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-provider-upcoming"
                title={`Intégration ${p.label} — configuration future`}
              >
                <Circle className="w-2 h-2 fill-current opacity-40" />
                {p.label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
