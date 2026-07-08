import {
  FileText, CreditCard, Receipt, Bell, Download, RefreshCw, Wallet,
  Calendar, CheckCircle, Clock, Shield,
} from 'lucide-react';
import type { DriverProfile } from '../../lib/driverTypes';
import type { DriverHrDossier, DriverHrContractMetadata, DriverPayslip } from '../../lib/driverHrTypes';
import { HR_COMPANY_NAME } from '../../lib/driverHrTypes';
import { exportContractPdf, exportPayslipPdf } from '../../lib/driverHrPdf';
import { fmtEuro } from '../../lib/format';

interface DriverHrDossierPanelProps {
  driver: DriverProfile;
  dossier: DriverHrDossier;
  canManage: boolean;
  onRegenerateContract: () => void;
  onRegenerateCard: () => void;
  regenerating?: boolean;
}

export function DriverHrDossierPanel({
  driver,
  dossier,
  canManage,
  onRegenerateContract,
  onRegenerateCard,
  regenerating,
}: DriverHrDossierPanelProps) {
  const contractMeta = dossier.contract?.metadata as DriverHrContractMetadata | undefined;

  return (
    <div className="space-y-5">
      <div className="driver-glass rounded-2xl p-5 border border-red-500/10">
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-5 h-5 text-red-400" />
          <div>
            <h2 className="text-base font-black text-white">Dossier chauffeur</h2>
            <p className="text-xs text-white/40">{HR_COMPANY_NAME} — Espace RH confidentiel (RP fictif)</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ContractCard
          contract={dossier.contract}
          meta={contractMeta}
          canManage={canManage}
          onDownload={() => contractMeta && exportContractPdf(contractMeta)}
          onRegenerate={onRegenerateContract}
          regenerating={regenerating}
        />
        <CompanyCardVisual
          card={dossier.companyCard}
          canManage={canManage}
          onRegenerate={onRegenerateCard}
          regenerating={regenerating}
        />
      </div>

      <PayslipsSection driverName={driver.name} payslips={dossier.payslips} />
      <PaymentHistorySection history={dossier.paymentHistory} />
      <HrNotificationsSection notifications={dossier.hrNotifications} />
    </div>
  );
}

function ContractCard({
  contract,
  meta,
  canManage,
  onDownload,
  onRegenerate,
  regenerating,
}: {
  contract: DriverHrDossier['contract'];
  meta?: DriverHrContractMetadata;
  canManage: boolean;
  onDownload: () => void;
  onRegenerate: () => void;
  regenerating?: boolean;
}) {
  return (
    <div className="driver-glass rounded-2xl p-5 border border-white/5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <FileText className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Contrat de travail</h3>
            <p className="text-[10px] text-white/35">{HR_COMPANY_NAME}</p>
          </div>
        </div>
        {contract && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
            {meta?.status ?? 'actif'}
          </span>
        )}
      </div>

      {!contract || !meta ? (
        <p className="text-sm text-white/30">Contrat non généré.</p>
      ) : (
        <div className="space-y-2 text-sm">
          <InfoLine label="Nom" value={meta.driver_name} />
          <InfoLine label="Pseudo" value={meta.pseudo ? `@${meta.pseudo}` : '—'} />
          <InfoLine label="Email" value={meta.email ?? '—'} />
          <InfoLine label="Date d'entrée" value={new Date(meta.entry_date).toLocaleDateString('fr-FR')} />
          <InfoLine label="Rôle" value={meta.role} />
          <InfoLine label="Type" value={meta.contract_type} />
          <InfoLine label="Signature admin" value={meta.admin_signature} />
          <InfoLine label="Signature chauffeur" value={meta.driver_signature ?? 'En attente'} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={!contract || !meta}
          onClick={onDownload}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/20 disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" />
          Télécharger le contrat PDF
        </button>
        {canManage && (
          <button
            type="button"
            disabled={regenerating}
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/5 text-white/50 border border-white/10 hover:bg-white/8 disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            Régénérer
          </button>
        )}
      </div>
    </div>
  );
}

function CompanyCardVisual({
  card,
  canManage,
  onRegenerate,
  regenerating,
}: {
  card: DriverHrDossier['companyCard'];
  canManage: boolean;
  onRegenerate: () => void;
  regenerating?: boolean;
}) {
  return (
    <div className="driver-glass rounded-2xl p-5 border border-white/5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <CreditCard className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Carte entreprise</h3>
          <p className="text-[10px] text-white/35">Crédit Agricole — RP fictif</p>
        </div>
      </div>

      {!card ? (
        <p className="text-sm text-white/30">Carte non générée.</p>
      ) : (
        <div
          className="relative rounded-2xl p-5 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0505 50%, #2d0a0a 100%)',
            border: '1px solid rgba(239,68,68,0.25)',
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-red-500/5 -translate-y-1/2 translate-x-1/2" />
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-4">{card.bank_name}</p>
          <p className="text-lg font-mono font-bold text-white tracking-[0.2em] mb-4">{card.masked_number}</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[9px] text-white/35 uppercase">Titulaire</p>
              <p className="text-sm font-bold text-white">{card.holder_name}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-white/35 uppercase">Plafond RP</p>
              <p className="text-sm font-bold text-red-400">{fmtEuro(card.spending_limit)}</p>
            </div>
          </div>
          <div className="flex justify-between mt-3 text-[10px] text-white/30">
            <span>{HR_COMPANY_NAME}</span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              {card.status}
            </span>
          </div>
          <p className="text-[9px] text-white/25 mt-3">
            Émise le {new Date(card.issued_at).toLocaleDateString('fr-FR')} — Aucun paiement réel
          </p>
        </div>
      )}

      {canManage && (
        <button
          type="button"
          disabled={regenerating}
          onClick={onRegenerate}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/5 text-white/50 border border-white/10 hover:bg-white/8 disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
          Régénérer carte
        </button>
      )}
    </div>
  );
}

function PayslipsSection({ driverName, payslips }: { driverName: string; payslips: DriverPayslip[] }) {
  return (
    <div className="driver-glass rounded-2xl p-5 border border-white/5">
      <div className="flex items-center gap-2 mb-4">
        <Receipt className="w-4 h-4 text-red-400" />
        <h3 className="text-sm font-bold text-white">Fiches de paie</h3>
        <span className="text-[10px] text-white/30 ml-auto">{payslips.length} document{payslips.length !== 1 ? 's' : ''}</span>
      </div>
      {payslips.length === 0 ? (
        <p className="text-sm text-white/30">Aucune fiche de paie — générées automatiquement lors du versement salaire.</p>
      ) : (
        <ul className="space-y-2">
          {payslips.map(p => {
            const label = new Date(p.year, p.month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-white/80">{label}</p>
                  <p className="text-[10px] text-white/35">
                    {p.km_total.toLocaleString('fr-FR')} km · {p.deliveries_total} livraisons · Brut {fmtEuro(p.gross_amount)}
                  </p>
                  {p.transaction_reference && (
                    <p className="text-[10px] text-white/25">Réf. {p.transaction_reference}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-emerald-400">{fmtEuro(p.net_amount)}</span>
                  <button
                    type="button"
                    onClick={() => exportPayslipPdf(driverName, p, p.payment_date ?? null, p.transaction_reference ?? null)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/15"
                  >
                    <Download className="w-3 h-3" />
                    PDF
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PaymentHistorySection({ history }: { history: DriverHrDossier['paymentHistory'] }) {
  return (
    <div className="driver-glass rounded-2xl p-5 border border-white/5">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-4 h-4 text-red-400" />
        <h3 className="text-sm font-bold text-white">Historique des paiements</h3>
      </div>
      {history.length === 0 ? (
        <p className="text-sm text-white/30">Aucun paiement enregistré.</p>
      ) : (
        <ul className="space-y-2">
          {history.map(h => (
            <li key={h.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 text-sm">
              <div>
                <p className="text-white/70">
                  {new Date(h.year, h.month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </p>
                <p className="text-[10px] text-white/30 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {h.payment_date ? new Date(h.payment_date).toLocaleDateString('fr-FR') : '—'}
                  {h.transaction_reference && ` · ${h.transaction_reference}`}
                </p>
              </div>
              <span className="font-bold text-emerald-400">{fmtEuro(h.net_amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HrNotificationsSection({ notifications }: { notifications: DriverHrDossier['hrNotifications'] }) {
  const unread = notifications.filter(n => !n.read).length;
  return (
    <div className="driver-glass rounded-2xl p-5 border border-white/5">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 text-red-400" />
        <h3 className="text-sm font-bold text-white">Notifications RH</h3>
        {unread > 0 && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-red-500 text-white font-bold">
            {unread}
          </span>
        )}
      </div>
      {notifications.length === 0 ? (
        <p className="text-sm text-white/30">Aucune notification RH.</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map(n => (
            <li key={n.id} className={`flex gap-3 py-2 border-b border-white/5 last:border-0 ${!n.read ? 'opacity-100' : 'opacity-60'}`}>
              {!n.read ? <Clock className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" /> : <CheckCircle className="w-3.5 h-3.5 text-white/25 mt-0.5 shrink-0" />}
              <div>
                <p className="text-sm font-semibold text-white/80">{n.title}</p>
                {n.message && <p className="text-xs text-white/40">{n.message}</p>}
                <p className="text-[10px] text-white/25 mt-0.5">{new Date(n.created_at).toLocaleString('fr-FR')}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1 border-b border-white/5 last:border-0">
      <span className="text-white/35 text-xs">{label}</span>
      <span className="text-white/75 text-xs font-medium text-right">{value}</span>
    </div>
  );
}
