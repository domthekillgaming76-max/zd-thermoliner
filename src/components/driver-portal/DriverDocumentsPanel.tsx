import { useMemo } from 'react';
import { AlertTriangle, ExternalLink, FileText, Shield } from 'lucide-react';
import type { DriverDocument, DriverSalaryRecord } from '../../lib/driverTypes';
import { DOC_TYPE_LABELS, DOCUMENT_STATUS_LABELS } from '../../lib/driverTypes';
import { formatDriverCurrency } from '../../lib/driverPortalTypes';

const PRIORITY_DOCS = ['license', 'adr', 'medical', 'contract'] as const;

interface DriverDocumentsPanelProps {
  documents: DriverDocument[];
  payslips: DriverSalaryRecord[];
  highlightPayslip?: boolean;
}

export function DriverDocumentsPanel({ documents, payslips, highlightPayslip }: DriverDocumentsPanelProps) {
  const expiring = useMemo(() => {
    const now = Date.now();
    const in30 = now + 30 * 24 * 60 * 60 * 1000;
    return documents.filter(d => {
      if (!d.expires_at) return false;
      const exp = new Date(d.expires_at).getTime();
      return exp < in30;
    });
  }, [documents]);

  const grouped = useMemo(() => {
    const map = new Map<string, DriverDocument[]>();
    for (const doc of documents) {
      const list = map.get(doc.doc_type) ?? [];
      list.push(doc);
      map.set(doc.doc_type, list);
    }
    return map;
  }, [documents]);

  return (
    <div className="space-y-4 driver-portal-fade-in">
      <div>
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-400" />
          Mes documents
        </h2>
        <p className="text-xs text-white/40 mt-0.5">Permis, ADR, certificats et contrat</p>
      </div>

      {expiring.length > 0 && (
        <div className="driver-portal-alert rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-300">Expiration proche</p>
            <ul className="mt-2 space-y-1">
              {expiring.map(d => (
                <li key={d.id} className="text-xs text-white/55">
                  {DOC_TYPE_LABELS[d.doc_type]} — expire le{' '}
                  {new Date(d.expires_at!).toLocaleDateString('fr-FR')}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {PRIORITY_DOCS.map(type => {
          const docs = grouped.get(type) ?? [];
          const latest = docs[0];
          const expired = latest?.expires_at && new Date(latest.expires_at) < new Date();
          const status = latest?.status ?? (expired ? 'expired' : latest ? 'valid' : 'pending');

          return (
            <article key={type} className="driver-portal-doc-card rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white">{DOC_TYPE_LABELS[type]}</p>
                    {latest?.expires_at ? (
                      <p className="text-xs text-white/40 mt-0.5">
                        Expire : {new Date(latest.expires_at).toLocaleDateString('fr-FR')}
                      </p>
                    ) : (
                      <p className="text-xs text-white/40 mt-0.5">
                        {latest ? 'Sans date d\'expiration' : 'Document non fourni'}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-1 rounded-full border font-bold shrink-0 ${
                    status === 'expired'
                      ? 'text-red-400 bg-red-500/10 border-red-500/25'
                      : status === 'valid'
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                        : 'text-amber-400 bg-amber-500/10 border-amber-500/25'
                  }`}
                >
                  {DOCUMENT_STATUS_LABELS[status as keyof typeof DOCUMENT_STATUS_LABELS] ?? status}
                </span>
              </div>
              {latest?.file_url && (
                <a
                  href={latest.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-red-400 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ouvrir le document
                </a>
              )}
            </article>
          );
        })}
      </div>

      <div className={`driver-portal-glass rounded-2xl p-4 space-y-3 ${highlightPayslip ? 'ring-2 ring-red-500/30' : ''}`}>
        <p className="text-sm font-bold text-white">Fiches de paie</p>
        {payslips.length === 0 ? (
          <p className="text-xs text-white/45">Aucune fiche de paie disponible.</p>
        ) : (
          payslips.slice(0, 6).map(p => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div>
                <p className="text-sm font-semibold text-white">
                  {String(p.period_month).padStart(2, '0')}/{p.period_year}
                </p>
                <p className="text-xs text-white/40">
                  Net : {formatDriverCurrency(Number(p.net_amount))}
                </p>
              </div>
              <span className="text-[10px] text-white/35 uppercase">{p.payment_status ?? 'pending'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
