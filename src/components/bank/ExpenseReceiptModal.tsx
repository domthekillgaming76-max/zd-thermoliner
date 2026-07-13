import { Printer, ReceiptText, X } from 'lucide-react';
import type { Transaction } from '../../lib/supabase';
import { formatCurrency, getTransactionTypeLabel } from '../../lib/bankUtils';

function receiptNumber(tx: Transaction): string {
  return String(tx.metadata?.receipt_number ?? tx.reference ?? `DEP-${tx.id.slice(0, 8).toUpperCase()}`);
}

function receiptHtml(tx: Transaction): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${receiptNumber(tx)}</title><style>body{font-family:monospace;padding:30px;max-width:420px;margin:auto}h1{text-align:center;font-size:20px}.line{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #aaa}.total{font-size:20px;font-weight:bold}.center{text-align:center;color:#555}</style></head><body><h1>Z&D THERMOLINER</h1><p class="center">Ticket de caisse entreprise<br>${receiptNumber(tx)}<br>${new Date(tx.created_at || tx.date).toLocaleString('fr-FR')}</p><div class="line"><span>Opération</span><span>${tx.description ?? getTransactionTypeLabel(tx.type, tx.category)}</span></div><div class="line"><span>Catégorie</span><span>${tx.category ?? getTransactionTypeLabel(tx.type)}</span></div><div class="line"><span>Mode</span><span>Compte entreprise</span></div><div class="line total"><span>TOTAL DÉBIT</span><span>${formatCurrency(Number(tx.amount))} €</span></div>${tx.balance_after != null ? `<p>Solde après opération : ${formatCurrency(Number(tx.balance_after))} €</p>` : ''}<p class="center">Document comptable RP</p></body></html>`;
}

export function ExpenseReceiptModal({ transaction, onClose }: { transaction: Transaction | null; onClose: () => void }) {
  if (!transaction) return null;
  const print = () => {
    const win = window.open('', '_blank', 'width=520,height=720');
    if (!win) return;
    win.document.write(receiptHtml(transaction));
    win.document.close();
    win.print();
  };
  return (
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[#f7f3e8] text-[#191919] shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <div className="p-5 border-b border-black/10 flex items-center justify-between"><div className="flex items-center gap-2"><ReceiptText className="w-5 h-5" /><strong>Ticket de caisse</strong></div><button type="button" onClick={onClose}><X className="w-5 h-5" /></button></div>
        <div className="p-6 font-mono">
          <h2 className="text-center font-black text-xl">Z&D THERMOLINER</h2>
          <p className="text-center text-xs opacity-60 mt-1">{receiptNumber(transaction)}<br />{new Date(transaction.created_at || transaction.date).toLocaleString('fr-FR')}</p>
          <div className="mt-6 py-3 border-y border-dashed border-black/30"><p className="font-bold">{transaction.description ?? getTransactionTypeLabel(transaction.type)}</p><p className="text-xs opacity-60 mt-1">{transaction.category ?? getTransactionTypeLabel(transaction.type)}</p></div>
          <div className="flex justify-between text-lg font-black py-5"><span>TOTAL DÉBIT</span><span>{formatCurrency(Number(transaction.amount))} €</span></div>
          {transaction.balance_after != null && <p className="text-xs opacity-60">Solde après opération : {formatCurrency(Number(transaction.balance_after))} €</p>}
        </div>
        <div className="p-4 border-t border-black/10 flex justify-end"><button type="button" onClick={print} className="px-4 py-2 rounded-xl bg-black text-white flex items-center gap-2 text-sm font-bold"><Printer className="w-4 h-4" />Imprimer</button></div>
      </div>
    </div>
  );
}
