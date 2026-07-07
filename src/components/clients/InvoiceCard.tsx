import { FileText } from 'lucide-react';
import { INVOICE_STATUS_LABELS, resolveInvoiceStatus, type Invoice } from '../../lib/clientTypes';
import { fmtEuro } from '../../lib/format';

interface InvoiceCardProps {
  invoice: Invoice;
  onSelect?: (invoice: Invoice) => void;
}

export function InvoiceCard({ invoice, onSelect }: InvoiceCardProps) {
  const status = resolveInvoiceStatus(invoice);
  const st = INVOICE_STATUS_LABELS[status];

  return (
    <button type="button" onClick={() => onSelect?.(invoice)}
      className="client-glass client-card-hover rounded-xl p-4 border border-white/5 text-left w-full">
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-red-400" />
          <span className="text-sm font-mono text-white/60">{invoice.invoice_number}</span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${st.color}`}>{st.label}</span>
      </div>
      <p className="text-white font-bold truncate">{invoice.client_name ?? 'Client'}</p>
      <div className="flex justify-between mt-2 text-xs text-white/40">
        <span>{new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}</span>
        <span>Éch. {new Date(invoice.due_date).toLocaleDateString('fr-FR')}</span>
      </div>
      <p className="text-lg font-black text-emerald-400 mt-2">{fmtEuro(invoice.amount_ttc)}</p>
    </button>
  );
}
