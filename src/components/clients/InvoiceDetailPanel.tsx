import { useState } from 'react';
import { X, Download, CheckCircle2, Send, Loader2 } from 'lucide-react';
import { INVOICE_STATUS_LABELS, resolveInvoiceStatus, type ErpClient, type Invoice } from '../../lib/clientTypes';
import { fmtEuro } from '../../lib/format';
import { exportInvoicePdf } from '../../lib/invoicePdf';

interface InvoiceDetailPanelProps {
  invoice: Invoice;
  client: ErpClient | null;
  canManage: boolean;
  paying: boolean;
  onClose: () => void;
  onMarkPaid: () => void;
  onMarkSent: () => void;
}

export function InvoiceDetailPanel({ invoice, client, canManage, paying, onClose, onMarkPaid, onMarkSent }: InvoiceDetailPanelProps) {
  const status = resolveInvoiceStatus(invoice);
  const st = INVOICE_STATUS_LABELS[status];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="client-glass rounded-2xl w-full max-w-md border border-white/10">
        <div className="p-4 border-b border-white/5 flex justify-between">
          <div>
            <p className="text-xs font-mono text-white/35">{invoice.invoice_number}</p>
            <h2 className="text-lg font-black text-white">{invoice.client_name}</h2>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border mt-1 inline-block font-semibold ${st.color}`}>{st.label}</span>
          </div>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-white/40" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Info label="Date" value={new Date(invoice.invoice_date).toLocaleDateString('fr-FR')} />
            <Info label="Échéance" value={new Date(invoice.due_date).toLocaleDateString('fr-FR')} />
            <Info label="HT" value={fmtEuro(invoice.amount_ht)} />
            <Info label={`TVA ${invoice.vat_rate}%`} value={fmtEuro(invoice.vat_amount)} />
          </div>
          <p className="text-2xl font-black text-emerald-400">{fmtEuro(invoice.amount_ttc)} TTC</p>
          {invoice.lines && invoice.lines.length > 0 && (
            <ul className="space-y-1 text-xs text-white/50 border-t border-white/5 pt-3">
              {invoice.lines.map(l => (
                <li key={l.id} className="flex justify-between">
                  <span>{l.description}</span>
                  <span>{fmtEuro(l.amount_ht)}</span>
                </li>
              ))}
            </ul>
          )}
          {canManage && (
            <div className="flex flex-wrap gap-2 pt-2">
              {status !== 'paid' && status !== 'cancelled' && (
                <button type="button" disabled={paying} onClick={onMarkPaid}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 disabled:opacity-50">
                  {paying ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Marquer payée
                </button>
              )}
              {status === 'draft' && (
                <button type="button" onClick={onMarkSent} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/25">
                  <Send className="w-3.5 h-3.5" /> Envoyer
                </button>
              )}
              {client && (
                <button type="button" onClick={() => exportInvoicePdf(client, invoice, invoice.lines ?? [])}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/5 text-white/60 border border-white/10">
                  <Download className="w-3.5 h-3.5" /> Export PDF
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-white/35 uppercase">{label}</p>
      <p className="text-white/80">{value}</p>
    </div>
  );
}

interface InvoiceCreateModalProps {
  open: boolean;
  clients: { id: string; name: string }[];
  billableSheets: { id: string; label: string }[];
  billableMissions: { id: string; label: string }[];
  saving: boolean;
  onClose: () => void;
  onCreateManual: (input: { client_id: string; invoice_date: string; due_date: string; description: string; amount: number }) => void;
  onCreateFromSheet: (roadSheetId: string) => void;
  onCreateFromMission: (missionId: string) => void;
}

export function InvoiceCreateModal({
  open, clients, billableSheets, billableMissions, saving, onClose,
  onCreateManual, onCreateFromSheet, onCreateFromMission,
}: InvoiceCreateModalProps) {
  const [mode, setMode] = useState<'manual' | 'sheet' | 'mission'>('manual');
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [sheetId, setSheetId] = useState('');
  const [missionId, setMissionId] = useState('');

  if (!open) return null;

  const today = new Date().toISOString().slice(0, 10);
  const due = new Date();
  due.setDate(due.getDate() + 30);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="client-glass rounded-2xl w-full max-w-md">
        <div className="p-4 border-b border-white/5 flex justify-between">
          <h2 className="font-bold text-white">Nouvelle facture</h2>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-white/40" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-1">
            {(['manual', 'sheet', 'mission'] as const).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold ${mode === m ? 'bg-red-500/15 text-red-400' : 'text-white/35'}`}>
                {m === 'manual' ? 'Manuelle' : m === 'sheet' ? 'Feuille' : 'Mission'}
              </button>
            ))}
          </div>
          {mode === 'manual' && (
            <>
              <select className="erp-select w-full text-sm" value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">— Client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input className="erp-input w-full text-sm" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
              <input type="number" className="erp-input w-full text-sm" placeholder="Montant HT €" value={amount} onChange={e => setAmount(e.target.value)} />
              <button type="button" disabled={!clientId || !description || saving} onClick={() => onCreateManual({
                client_id: clientId, invoice_date: today, due_date: due.toISOString().slice(0, 10), description, amount: parseFloat(amount) || 0,
              })} className="btn-primary w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">Créer</button>
            </>
          )}
          {mode === 'sheet' && (
            <>
              <select className="erp-select w-full text-sm" value={sheetId} onChange={e => setSheetId(e.target.value)}>
                <option value="">— Feuille validée —</option>
                {billableSheets.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <button type="button" disabled={!sheetId || saving} onClick={() => onCreateFromSheet(sheetId)} className="btn-primary w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">Créer depuis feuille</button>
            </>
          )}
          {mode === 'mission' && (
            <>
              <select className="erp-select w-full text-sm" value={missionId} onChange={e => setMissionId(e.target.value)}>
                <option value="">— Mission livrée —</option>
                {billableMissions.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <button type="button" disabled={!missionId || saving} onClick={() => onCreateFromMission(missionId)} className="btn-primary w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">Créer depuis mission</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface ContractFormModalProps {
  open: boolean;
  clients: { id: string; name: string }[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: { client_id: string; start_date: string; end_date: string; price_per_km: number; cargo_type: string; payment_delay: number }) => void;
}

export function ContractFormModal({ open, clients, saving, onClose, onSubmit }: ContractFormModalProps) {
  const [clientId, setClientId] = useState('');
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState('');
  const [priceKm, setPriceKm] = useState('1.5');
  const [cargo, setCargo] = useState('');
  const [delay, setDelay] = useState('30');

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="client-glass rounded-2xl w-full max-w-md p-5 space-y-3">
        <div className="flex justify-between"><h2 className="font-bold text-white">Nouveau contrat</h2><button type="button" onClick={onClose}><X className="w-4 h-4 text-white/40" /></button></div>
        <select className="erp-select w-full text-sm" value={clientId} onChange={e => setClientId(e.target.value)}>
          <option value="">— Client —</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input type="date" className="erp-input text-sm" value={start} onChange={e => setStart(e.target.value)} />
          <input type="date" className="erp-input text-sm" value={end} onChange={e => setEnd(e.target.value)} />
        </div>
        <input className="erp-input w-full text-sm" placeholder="Prix / km" value={priceKm} onChange={e => setPriceKm(e.target.value)} />
        <input className="erp-input w-full text-sm" placeholder="Type de fret" value={cargo} onChange={e => setCargo(e.target.value)} />
        <input type="number" className="erp-input w-full text-sm" placeholder="Délai paiement (j)" value={delay} onChange={e => setDelay(e.target.value)} />
        <button type="button" disabled={!clientId || !end || saving} onClick={() => onSubmit({
          client_id: clientId, start_date: start, end_date: end,
          price_per_km: parseFloat(priceKm) || 0, cargo_type: cargo, payment_delay: parseInt(delay) || 30,
        })} className="btn-primary w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">Créer le contrat</button>
      </div>
    </div>
  );
}
