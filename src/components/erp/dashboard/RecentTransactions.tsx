import { Banknote, TrendingDown, TrendingUp } from 'lucide-react';
import type { Transaction } from '../../../lib/supabase';
import { fmt, fmtDate } from '../../../lib/format';
import { Panel, PanelHeader } from '../Panel';
import { EmptyState } from '../EmptyState';
import { SkeletonList } from '../Skeleton';
import { useAuth } from '../../../contexts/AuthContext';
import { canAccessBank } from '../../../lib/bankPermissions';

interface RecentTransactionsProps {
  transactions: Transaction[];
  loading?: boolean;
}

export function RecentTransactions({ transactions, loading }: RecentTransactionsProps) {
  const { profile, user } = useAuth();
  const bankLink = canAccessBank(profile?.role, user?.email ?? profile?.email) ? '/bank' : '/finance';

  return (
    <Panel className="h-full">
      <PanelHeader title="Transactions récentes" icon={Banknote} to={bankLink} />
      {loading ? (
        <SkeletonList count={5} />
      ) : transactions.length === 0 ? (
        <EmptyState icon={Banknote} title="Aucune transaction" description="Les mouvements bancaires s'afficheront ici." />
      ) : (
        <div className="space-y-2">
          {transactions.map(tx => {
            const isIncome = tx.type === 'income';
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.04)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isIncome ? 'bg-emerald-500/10' : 'bg-red-500/10'
                    }`}
                  >
                    {isIncome
                      ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                      : <TrendingDown className="w-4 h-4 text-red-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">
                      {tx.description || tx.category || 'Transaction'}
                    </p>
                    <p className="text-[10px] text-white/30">{fmtDate(tx.date || tx.created_at)}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold flex-shrink-0 ml-2 ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isIncome ? '+' : '-'}{fmt(Number(tx.amount))} €
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
