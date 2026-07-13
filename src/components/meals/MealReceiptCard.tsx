import { Printer, Receipt } from 'lucide-react';
import type { MealOrder } from '../../lib/mealTypes';
import { fmtEuro } from '../../lib/format';

export function printMealReceipt(order: MealOrder) {
  const lines = order.items.map(item => `<tr><td>${item.quantity} × ${item.name}</td><td>${fmtEuro(item.total)}</td></tr>`).join('');
  const win = window.open('', '_blank', 'width=520,height=720');
  if (!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${order.receipt_number}</title><style>body{font-family:monospace;padding:28px;max-width:420px;margin:auto}h1{text-align:center;font-size:20px}table{width:100%;border-collapse:collapse}td{padding:7px 0;border-bottom:1px dashed #bbb}td:last-child{text-align:right}.total{font-size:18px;font-weight:bold;text-align:right;margin-top:18px}.center{text-align:center}</style></head><body><h1>${order.restaurant}</h1><p class="center">Ticket ${order.receipt_number}<br>${new Date(order.created_at).toLocaleString('fr-FR')}</p><table>${lines}</table><p class="total">TOTAL : ${fmtEuro(order.total_amount)}</p><p>Carte chauffeur •••• — Solde après achat : ${fmtEuro(order.balance_after)}</p><p class="center">Merci et bonne route !</p></body></html>`);
  win.document.close();
  win.print();
}

export function MealReceiptCard({ order }: { order: MealOrder }) {
  return (
    <article className="erp-card rounded-2xl p-4 border border-rose-500/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-black text-white"><Receipt className="w-4 h-4 text-rose-400" />{order.restaurant}</p>
          <p className="text-[11px] text-white/35 mt-1">{order.receipt_number} · {new Date(order.created_at).toLocaleString('fr-FR')}</p>
        </div>
        <button type="button" onClick={() => printMealReceipt(order)} className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-rose-300" aria-label="Imprimer le ticket"><Printer className="w-4 h-4" /></button>
      </div>
      <div className="mt-3 space-y-1.5">
        {order.items.map(item => <div key={`${order.id}-${item.id}`} className="flex justify-between text-xs"><span className="text-white/55">{item.quantity} × {item.name}</span><span className="text-white/80">{fmtEuro(item.total)}</span></div>)}
      </div>
      <div className="mt-3 pt-3 border-t border-white/5 flex justify-between"><span className="text-xs font-bold text-white/45">Total carte chauffeur</span><strong className="text-rose-300">{fmtEuro(order.total_amount)}</strong></div>
    </article>
  );
}
