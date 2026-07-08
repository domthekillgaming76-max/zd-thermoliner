import { fmtEuro } from './format';
import type { DriverHrContractMetadata, DriverPayslip } from './driverHrTypes';
import { HR_COMPANY_NAME, HR_CONTRACT_TYPE } from './driverHrTypes';

function openPrintableHtml(title: string, body: string): void {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #111; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; border-bottom: 3px solid #dc2626; padding-bottom: 20px; margin-bottom: 30px; }
    .brand { font-size: 22px; font-weight: 900; color: #dc2626; }
    .brand span { color: #111; font-size: 11px; display: block; font-weight: normal; }
    .meta { text-align: right; font-size: 12px; color: #555; }
    h2 { font-size: 16px; margin: 24px 0 12px; color: #dc2626; text-transform: uppercase; letter-spacing: 0.05em; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .field { font-size: 13px; line-height: 1.6; }
    .field label { display: block; font-size: 10px; text-transform: uppercase; color: #888; margin-bottom: 2px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; }
    .sig-box { border-top: 1px solid #ccc; padding-top: 8px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #f5f5f5; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; }
    td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 13px; }
    .net { font-size: 18px; font-weight: bold; color: #dc2626; }
    .footer { margin-top: 40px; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 12px; }
    .rp-badge { display: inline-block; background: #fef2f2; color: #dc2626; font-size: 10px; padding: 2px 8px; border-radius: 4px; margin-top: 8px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  ${body}
  <div class="footer">${HR_COMPANY_NAME} ERP — Document généré automatiquement (RP fictif)</div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

export function exportContractPdf(meta: DriverHrContractMetadata): void {
  const body = `
  <div class="header">
    <div class="brand">${HR_COMPANY_NAME}<span>Transport &amp; Logistique — ETS2/ATS</span></div>
    <div class="meta">
      <strong>Contrat de travail</strong><br/>
      Date d'entrée : ${new Date(meta.entry_date).toLocaleDateString('fr-FR')}<br/>
      Statut : ${meta.status}
    </div>
  </div>
  <h2>Informations salarié</h2>
  <div class="grid">
    <div class="field"><label>Nom</label><strong>${meta.driver_name}</strong></div>
    <div class="field"><label>Pseudo</label>${meta.pseudo ? `@${meta.pseudo}` : '—'}</div>
    <div class="field"><label>Email</label>${meta.email ?? '—'}</div>
    <div class="field"><label>Rôle</label>${meta.role}</div>
    <div class="field"><label>Société</label>${meta.company}</div>
    <div class="field"><label>Type de contrat</label>${meta.contract_type}</div>
  </div>
  <p style="font-size:12px;color:#555;line-height:1.7;margin-top:20px">
    Le présent contrat de travail RP est conclu entre <strong>${meta.company}</strong> et
    <strong>${meta.driver_name}</strong> en qualité de chauffeur VTC dans le cadre du jeu Euro Truck Simulator 2 / American Truck Simulator.
    Ce document est purement fictif et ne constitue pas un contrat de travail réel.
  </p>
  <span class="rp-badge">Document RP — aucune valeur juridique réelle</span>
  <div class="signatures">
    <div class="sig-box">
      <strong>Signature employeur</strong><br/>${meta.admin_signature}<br/>
      <em style="font-size:10px;color:#888">Z&amp;D Thermoliner — Direction RH</em>
    </div>
    <div class="sig-box">
      <strong>Signature chauffeur</strong><br/>${meta.driver_signature ?? 'En attente de signature'}<br/>
      ${meta.signed_at ? `<em style="font-size:10px;color:#888">Signé le ${new Date(meta.signed_at).toLocaleDateString('fr-FR')}</em>` : ''}
    </div>
  </div>`;

  openPrintableHtml(`Contrat — ${meta.driver_name}`, body);
}

export function exportPayslipPdf(
  driverName: string,
  payslip: DriverPayslip,
  paymentDate: string | null,
  transactionRef: string | null,
): void {
  const monthLabel = new Date(payslip.year, payslip.month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const body = `
  <div class="header">
    <div class="brand">${HR_COMPANY_NAME}<span>Bulletin de paie RP</span></div>
    <div class="meta">
      <strong>Fiche de paie</strong><br/>
      Période : ${monthLabel}<br/>
      ${paymentDate ? `Date paiement : ${new Date(paymentDate).toLocaleDateString('fr-FR')}` : ''}
    </div>
  </div>
  <div class="grid">
    <div class="field"><label>Salarié</label><strong>${driverName}</strong></div>
    <div class="field"><label>Société</label>${HR_COMPANY_NAME}</div>
    <div class="field"><label>Kilomètres</label>${payslip.km_total.toLocaleString('fr-FR')} km</div>
    <div class="field"><label>Livraisons validées</label>${payslip.deliveries_total}</div>
  </div>
  <table>
    <thead><tr><th>Libellé</th><th style="text-align:right">Montant</th></tr></thead>
    <tbody>
      <tr><td>Salaire brut RP</td><td style="text-align:right">${fmtEuro(payslip.gross_amount)}</td></tr>
      <tr><td>Prime</td><td style="text-align:right">${fmtEuro(payslip.bonus_amount)}</td></tr>
      ${payslip.deductions_amount > 0 ? `<tr><td>Retenues RP</td><td style="text-align:right">-${fmtEuro(payslip.deductions_amount)}</td></tr>` : ''}
      <tr><td class="net"><strong>Salaire net versé</strong></td><td class="net" style="text-align:right"><strong>${fmtEuro(payslip.net_amount)}</strong></td></tr>
    </tbody>
  </table>
  ${transactionRef ? `<p style="font-size:11px;color:#666">Réf. transaction bancaire : ${transactionRef}</p>` : ''}
  <span class="rp-badge">Fiche de paie RP fictive — ${HR_CONTRACT_TYPE}</span>`;

  openPrintableHtml(`Fiche de paie — ${monthLabel}`, body);
}
