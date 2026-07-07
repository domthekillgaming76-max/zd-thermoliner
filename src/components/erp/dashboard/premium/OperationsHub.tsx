import { useState } from 'react';
import { Route, ArrowLeftRight, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { RoadSheet, Transaction } from '../../../../lib/supabase';
import { fmt, fmtDate, fmtDateTime } from '../../../../lib/format';

interface OperationsHubProps {
  roadSheets: RoadSheet[];
  transactions: Transaction[];
  loading?: boolean;
}

type Tab = 'routes' | 'transactions';

export function OperationsHub({ roadSheets, transactions, loading }: OperationsHubProps) {
  const [tab, setTab] = useState<Tab>('routes');

  return (
    <div className="premium-panel rounded-2xl md:rounded-3xl p-5 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500/10 border border-orange-500/20">
            <Route className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Opérations</h2>
            <p className="text-[11px] text-white/30">Activité récente</p>
          </div>
        </div>

        <div className="flex rounded-xl p-1 bg-white/[0.03] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setTab('routes')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              tab === 'routes'
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            Feuilles
          </button>
          <button
            type="button"
            onClick={() => setTab('transactions')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              tab === 'transactions'
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            Transactions
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 flex-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl shimmer" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      ) : tab === 'routes' ? (
        <div className="space-y-2 flex-1 overflow-auto">
          {roadSheets.length === 0 ? (
            <EmptyOps message="Aucune feuille de route" />
          ) : (
            roadSheets.map(sheet => (
              <div
                key={sheet.id}
                className="premium-ops-row flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/[0.03]"
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    sheet.validated ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {sheet.departure || sheet.departure_city || '?'} →{' '}
                    {sheet.arrival || sheet.arrival_city || '?'}
                  </p>
                  <p className="text-[10px] text-white/30 truncate">
                    {sheet.driver_name || 'Chauffeur'} · {fmtDate(sheet.date || sheet.created_at)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-emerald-400">
                    {fmt(Number(sheet.revenue || 0))} €
                  </p>
                  <p className={`text-[10px] ${sheet.validated ? 'text-emerald-400/50' : 'text-amber-400/70'}`}>
                    {sheet.validated ? 'Validée' : 'En attente'}
                  </p>
                </div>
              </div>
            ))
          )}
          <Link
            to="/road-sheets"
            className="flex items-center justify-center gap-1 text-xs text-red-400/80 hover:text-red-300 pt-2 transition-colors"
          >
            Voir toutes les feuilles <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-auto">
          {transactions.length === 0 ? (
            <EmptyOps message="Aucune transaction" />
          ) : (
            transactions.map(tx => (
              <div
                key={tx.id}
                className="premium-ops-row flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/[0.03]"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    tx.type === 'income'
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'bg-red-500/10 border border-red-500/20'
                  }`}
                >
                  <ArrowLeftRight
                    className={`w-3.5 h-3.5 ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {tx.description || (tx.type === 'income' ? 'Revenu' : 'Dépense')}
                  </p>
                  <p className="text-[10px] text-white/30">
                    {fmtDateTime(tx.created_at || tx.date)}
                  </p>
                </div>
                <p
                  className={`text-xs font-bold flex-shrink-0 ${
                    tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {tx.type === 'income' ? '+' : '-'}{fmt(Number(tx.amount))} €
                </p>
              </div>
            ))
          )}
          <Link
            to="/finance"
            className="flex items-center justify-center gap-1 text-xs text-red-400/80 hover:text-red-300 pt-2 transition-colors"
          >
            Voir toutes les transactions <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

function EmptyOps({ message }: { message: string }) {
  return (
    <div className="flex-1 flex items-center justify-center text-white/20 text-sm py-8">
      {message}
    </div>
  );
}
