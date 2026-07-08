import { CheckCircle, Send } from 'lucide-react';
import type { FinanceInvoiceRow } from '../../lib/financeTypes';
import { FINANCE_INVOICE_STATUS_LABELS, formatFinanceEuro, resolveFinanceInvoiceStatus } from '../../lib/financeTypes';

interface FinanceInvoicesTableProps {
  invoices: FinanceInvoiceRow[];
  canManage?: boolean;
  onMarkPaid?: (id: string) => void;
  onMarkSent?: (id: string) => void;
  busyId?: string | null;
}

export function FinanceInvoicesTable({
  invoices, canManage, onMarkPaid, onMarkSent, busyId,
}: FinanceInvoicesTableProps) {
  if (invoices.length === 0) {
    return (
      <div className="erp-card rounded-2xl p-12 text-center text-white/30 text-sm">
        Aucune facture
      </div>
    );
  }

  return (
    <div className="erp-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-white/35 border-b border-white/5">
              <th className="px-4 py-3">N°</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Km</th>
              <th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3">HT</th>
              <th className="px-4 py-3">TVA</th>
              <th className="px-4 py-3">TTC</th>
              <th className="px-4 py-3">Statut</th>
              {canManage && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => {
              const status = resolveFinanceInvoiceStatus(inv.payment_status, inv.due_date);
              const badge = FINANCE_INVOICE_STATUS_LABELS[status] ?? FINANCE_INVOICE_STATUS_LABELS.draft;
              return (
                <tr key={inv.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-xs text-white/70">{inv.invoice_number ?? '—'}</td>
                  <td className="px-4 py-3 text-white">{inv.client_name ?? '—'}</td>
                  <td className="px-4 py-3 text-white/60">{inv.route_summary ?? '—'}</td>
                  <td className="px-4 py-3 text-white/50">{inv.distance_km || '—'}</td>
                  <td className="px-4 py-3 text-white/50">{inv.cargo_type ?? '—'}</td>
                  <td className="px-4 py-3 text-white/70">{formatFinanceEuro(inv.amount_ht)}</td>
                  <td className="px-4 py-3 text-white/50">{inv.vat_rate}%</td>
                  <td className="px-4 py-3 font-semibold text-white">{formatFinanceEuro(inv.amount_ttc)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {inv.payment_status === 'draft' && onMarkSent && (
                          <button
                            type="button"
                            disabled={busyId === inv.id}
                            onClick={() => onMarkSent(inv.id)}
                            className="p-2 rounded-lg hover:bg-white/5 text-blue-400"
                            title="Marquer envoyée"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {inv.payment_status !== 'paid' && onMarkPaid && (
                          <button
                            type="button"
                            disabled={busyId === inv.id}
                            onClick={() => onMarkPaid(inv.id)}
                            className="p-2 rounded-lg hover:bg-white/5 text-emerald-400"
                            title="Marquer payée"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
