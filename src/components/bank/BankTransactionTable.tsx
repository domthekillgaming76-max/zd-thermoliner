import { Loader2, Trash2, TrendingDown, TrendingUp, Zap, ReceiptText } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '../erp/EmptyState';
import { SkeletonList } from '../erp/Skeleton';
import {
  formatCurrency,
  getTransactionTypeLabel,
  isCreditTransaction,
} from '../../lib/bankUtils';
import type { Transaction } from '../../lib/supabase';
import { Banknote } from 'lucide-react';
import { ExpenseReceiptModal } from './ExpenseReceiptModal';

interface BankTransactionTableProps {
  transactions: Transaction[];
  loading?: boolean;
  deletingId?: string | null;
  onDelete?: (id: string) => void;
}

export function BankTransactionTable({
  transactions,
  loading,
  deletingId,
  onDelete,
}: BankTransactionTableProps) {
  const [receiptTransaction, setReceiptTransaction] = useState<Transaction | null>(null);
  if (loading) {
    return (
      <div className="erp-card rounded-2xl p-4">
        <SkeletonList count={6} />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="erp-card rounded-2xl p-8">
        <EmptyState
          icon={Banknote}
          title="Aucune transaction"
          description="Les opérations manuelles et les feuilles de route validées apparaîtront ici."
        />
      </div>
    );
  }

  return (
    <div className="erp-card rounded-2xl overflow-hidden">
      <div className="hidden md:grid grid-cols-[1fr_120px_120px_100px_84px] gap-4 px-5 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider border-b border-white/5">
        <span>Description</span>
        <span>Type</span>
        <span>Date</span>
        <span className="text-right">Montant</span>
        <span />
      </div>
      <div className="divide-y divide-white/[0.04]">
        {transactions.map(tx => {
          const credit = isCreditTransaction(tx);
          const isDeleting = deletingId === tx.id;

          return (
            <div
              key={tx.id}
              className="flex flex-col md:grid md:grid-cols-[1fr_120px_120px_100px_84px] gap-2 md:gap-4 md:items-center px-4 md:px-5 py-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    credit ? 'bg-emerald-500/10' : 'bg-red-500/10'
                  }`}
                >
                  {credit ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white text-sm font-medium truncate">
                      {tx.description || getTransactionTypeLabel(tx.type, tx.category)}
                    </p>
                    {tx.auto_generated && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md text-amber-400 bg-amber-500/10 border border-amber-500/20">
                        <Zap className="w-3 h-3" />
                        Auto
                      </span>
                    )}
                    {tx.status === 'pending' && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md text-blue-400 bg-blue-500/10 border border-blue-500/20">
                        En attente
                      </span>
                    )}
                  </div>
                  <p className="text-white/25 text-xs mt-0.5">
                    {tx.category && <span className="text-white/40 mr-2">{tx.category}</span>}
                    {tx.balance_after != null && (
                      <span>Solde: {formatCurrency(Number(tx.balance_after))} €</span>
                    )}
                  </p>
                </div>
              </div>

              <span className="text-white/50 text-xs md:text-sm">
                {getTransactionTypeLabel(tx.type, tx.category)}
              </span>

              <span className="text-white/40 text-xs md:text-sm">
                {new Date(tx.date || tx.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>

              <span
                className={`text-sm font-bold md:text-right ${
                  credit ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {credit ? '+' : '-'}
                {formatCurrency(Number(tx.amount))} €
              </span>

              <div className="flex justify-end gap-1">
                {!credit && tx.status !== 'pending' && (
                  <button type="button" onClick={() => setReceiptTransaction(tx)} className="w-8 h-8 hover:bg-amber-500/10 rounded-lg flex items-center justify-center" aria-label="Voir le ticket de caisse"><ReceiptText className="w-3.5 h-3.5 text-amber-400/70" /></button>
                )}
                {onDelete && !tx.auto_generated && (
                  <button
                    type="button"
                    onClick={() => onDelete(tx.id)}
                    disabled={isDeleting}
                    className="w-8 h-8 hover:bg-red-500/10 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                    aria-label="Supprimer"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 text-white/30 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 text-white/20 hover:text-red-400" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ExpenseReceiptModal transaction={receiptTransaction} onClose={() => setReceiptTransaction(null)} />
    </div>
  );
}
