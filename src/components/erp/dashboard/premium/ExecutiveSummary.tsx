interface ExecutiveSummaryProps {
  highlights: {
    label: string;
    value: string;
    sub: string;
    positive: boolean;
  }[];
  loading?: boolean;
}

export function ExecutiveSummary({ highlights, loading }: ExecutiveSummaryProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {highlights.map((item, i) => (
        <div
          key={item.label}
          className="premium-summary-card rounded-2xl p-4 md:p-5 opacity-0 animate-slide-up"
          style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}
        >
          {loading ? (
            <>
              <div className="h-3 w-24 rounded shimmer mb-3" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="h-8 w-32 rounded shimmer mb-2" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="h-2.5 w-40 rounded shimmer" style={{ background: 'rgba(255,255,255,0.03)' }} />
            </>
          ) : (
            <>
              <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest mb-2">
                {item.label}
              </p>
              <p className="text-xl md:text-2xl font-black text-white mb-1.5">{item.value}</p>
              <p
                className={`text-[11px] font-medium ${
                  item.positive ? 'text-emerald-400/70' : 'text-amber-400/70'
                }`}
              >
                {item.sub}
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
