import type { AssistantKpi } from '../../lib/assistantTypes';

interface AssistantKpiCardsProps {
  kpis: AssistantKpi[];
}

export function AssistantKpiCards({ kpis }: AssistantKpiCardsProps) {
  if (!kpis.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
      {kpis.map(kpi => (
        <div
          key={kpi.label}
          className="assistant-kpi-card rounded-xl p-3 border border-white/8"
          style={kpi.color ? { borderColor: `${kpi.color}30` } : undefined}
        >
          <p className="text-[10px] text-white/35 uppercase">{kpi.label}</p>
          <p className="text-lg font-black text-white mt-0.5" style={kpi.color ? { color: kpi.color } : undefined}>
            {kpi.value}
          </p>
          {kpi.trend && <p className="text-[10px] text-white/40 mt-0.5">{kpi.trend}</p>}
        </div>
      ))}
    </div>
  );
}
