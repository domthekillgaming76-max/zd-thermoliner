import { Zap } from 'lucide-react';
import { formatCurrency } from '../../../lib/bankUtils';
import type { AutoRoadSheetSyncSummary } from '../../../lib/bankTreasuryAnalytics';
import { BankGlassPanel } from './BankGlassPanel';

interface BankAutoSyncPanelProps {
  autoSync: AutoRoadSheetSyncSummary;
  loading?: boolean;
}

const LINES: { key: keyof AutoRoadSheetSyncSummary; label: string; color: string }[] = [
  { key: 'revenue', label: 'Revenus', color: '#3EBFA0' },
  { key: 'fuel', label: 'Carburant', color: '#D66B6B' },
  { key: 'tolls', label: 'Péages', color: '#D66B6B' },
  { key: 'repairs', label: 'Réparations', color: '#D66B6B' },
  { key: 'insurance', label: 'Assurance', color: '#D66B6B' },
  { key: 'salary', label: 'Salaires', color: '#D66B6B' },
  { key: 'netProfit', label: 'Bénéfice net', color: '#60a5fa' },
];

export function BankAutoSyncPanel({ autoSync, loading }: BankAutoSyncPanelProps) {
  return (
    <BankGlassPanel className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm font-bold text-white">Transactions automatiques</h2>
        <span className="text-[10px] text-white/35">Feuilles validées → banque</span>
      </div>
      {loading ? (
        <div className="h-32 shimmer bank-lounge-shimmer rounded-xl" />
      ) : (
        <>
          <p className="text-xs text-white/40 mb-3">{autoSync.sheetCount} feuille(s) comptabilisée(s)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {LINES.map(line => (
              <div key={line.key} className="rounded-xl p-3 bank-metric-well text-center">
                <p className="text-[9px] uppercase tracking-wider text-white/35 mb-1">{line.label}</p>
                <p className="text-sm font-black" style={{ color: line.color }}>
                  {formatCurrency(autoSync[line.key] as number)} €
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </BankGlassPanel>
  );
}
