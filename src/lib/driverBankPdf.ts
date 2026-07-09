import { fmtEuro } from './format';
import type { DriverBankAccount, DriverBankTransaction } from './driverBankTypes';
import type { DriverPayslip } from './driverHrTypes';
import { HR_COMPANY_NAME } from './driverHrTypes';
import { DRIVER_BANK_NAME } from './driverBankTypes';

function openPrintableHtml(title: string, body: string): void {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #111; padding: 40px; max-width: 820px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; border-bottom: 3px solid #dc2626; padding-bottom: 20px; margin-bottom: 24px; }
    .brand { font-size: 22px; font-weight: 900; color: #dc2626; }
    .brand span { color: #111; font-size: 11px; display: block; font-weight: normal; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #f5f5f5; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; }
    td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 13px; }
    .credit { color: #16a34a; font-weight: 600; }
    .debit { color: #dc2626; font-weight: 600; }
    .footer { margin-top: 40px; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 12px; }
    .rp-badge { display: inline-block; background: #fef2f2; color: #dc2626; font-size: 10px; padding: 2px 8px; border-radius: 4px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>${body}
  <div class="footer">${HR_COMPANY_NAME} — Relevé bancaire RP fictif (simulation ETS2/ATS)</div>
  <script>window.onload = () => window.print();</script>
</body></html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

export function exportDriverBankStatementPdf(
  account: DriverBankAccount,
  transactions: DriverBankTransaction[],
  openingBalance: number,
  closingBalance: number,
): void {
  const periodStart = transactions.length
    ? new Date(transactions[transactions.length - 1].created_at).toLocaleDateString('fr-FR')
    : new Date(account.opened_at).toLocaleDateString('fr-FR');
  const periodEnd = new Date().toLocaleDateString('fr-FR');

  const rows = transactions.map(tx => `
    <tr>
      <td>${new Date(tx.created_at).toLocaleDateString('fr-FR')}</td>
      <td>${tx.label}</td>
      <td>${tx.reference ?? '—'}</td>
      <td>${tx.type}</td>
      <td class="${tx.direction === 'credit' ? 'credit' : 'debit'}">${tx.direction === 'credit' ? '+' : '-'}${fmtEuro(tx.amount)}</td>
      <td>${fmtEuro(tx.balance_after)}</td>
    </tr>`).join('');

  const body = `
  <div class="header">
    <div class="brand">${HR_COMPANY_NAME}<span>${DRIVER_BANK_NAME}</span></div>
    <div style="text-align:right;font-size:12px;color:#555">
      <strong>Relevé de compte RP</strong><br/>
      Période : ${periodStart} → ${periodEnd}
    </div>
  </div>
  <p style="font-size:13px;margin-bottom:16px">
    <strong>${account.holder_name}</strong>${account.holder_pseudo ? ` (@${account.holder_pseudo})` : ''}<br/>
    IBAN : ${account.rp_iban}<br/>
    N° compte : ${account.account_number}
  </p>
  <table>
    <tr><td>Solde début</td><td><strong>${fmtEuro(openingBalance)}</strong></td></tr>
    <tr><td>Solde fin</td><td><strong>${fmtEuro(closingBalance)}</strong></td></tr>
  </table>
  <table>
    <thead><tr><th>Date</th><th>Libellé</th><th>Réf.</th><th>Type</th><th>Montant</th><th>Solde</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6">Aucune opération</td></tr>'}</tbody>
  </table>
  <span class="rp-badge">Document RP — aucun paiement réel</span>`;

  openPrintableHtml(`Relevé — ${account.holder_name}`, body);
}

export interface EnhancedPayslipPdfData {
  driverName: string;
  pseudo: string | null;
  email: string | null;
  iban: string;
  payslip: DriverPayslip;
  paymentReference: string | null;
  paymentDate: string | null;
}

export function exportEnhancedPayslipPdf(data: EnhancedPayslipPdfData): void {
  const monthLabel = new Date(data.payslip.year, data.payslip.month - 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const body = `
  <div class="header">
    <div class="brand">${HR_COMPANY_NAME}<span>Fiche de paie officielle RP</span></div>
    <div style="text-align:right;font-size:12px;color:#555">
      <strong>${monthLabel}</strong><br/>
      Réf. : ${data.paymentReference ?? '—'}
    </div>
  </div>
  <table>
    <tr><th>Chauffeur</th><td>${data.driverName}${data.pseudo ? ` (@${data.pseudo})` : ''}</td></tr>
    <tr><th>Email</th><td>${data.email ?? '—'}</td></tr>
    <tr><th>Poste</th><td>Chauffeur routier RP</td></tr>
    <tr><th>Entreprise</th><td>${HR_COMPANY_NAME}</td></tr>
    <tr><th>Banque</th><td>${DRIVER_BANK_NAME}</td></tr>
    <tr><th>IBAN chauffeur</th><td>${data.iban}</td></tr>
    <tr><th>Km validés</th><td>${data.payslip.km_total} km</td></tr>
    <tr><th>Livraisons</th><td>${data.payslip.deliveries_total}</td></tr>
    <tr><th>Salaire base RP</th><td>${fmtEuro(data.payslip.base_salary ?? data.payslip.gross_amount - data.payslip.bonus_amount)}</td></tr>
    <tr><th>Prime km</th><td>${fmtEuro(data.payslip.km_bonus ?? 0)}</td></tr>
    <tr><th>Prime livraison</th><td>${fmtEuro(data.payslip.delivery_bonus ?? 0)}</td></tr>
    <tr><th>Bonus</th><td>${fmtEuro(data.payslip.extra_bonus ?? data.payslip.bonus_amount)}</td></tr>
    <tr><th>Retenues RP</th><td>${fmtEuro(data.payslip.deductions ?? data.payslip.deductions_amount)}</td></tr>
    <tr><th>Total brut RP</th><td><strong>${fmtEuro(data.payslip.gross_amount)}</strong></td></tr>
    <tr><th>Net versé</th><td style="color:#dc2626;font-size:18px;font-weight:bold">${fmtEuro(data.payslip.net_amount)}</td></tr>
    <tr><th>Date paiement</th><td>${data.paymentDate ? new Date(data.paymentDate).toLocaleDateString('fr-FR') : '—'}</td></tr>
  </table>
  <p style="margin-top:40px;font-size:12px">Signature direction : <strong>DOM76 — Z&D Thermoliner</strong></p>
  <span class="rp-badge">Fiche de paie RP fictive — simulation interne</span>`;

  openPrintableHtml(`Fiche de paie — ${data.driverName}`, body);
}
