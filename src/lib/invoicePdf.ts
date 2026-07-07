import { fmtEuro } from './format';
import type { ErpClient, Invoice, InvoiceLine } from './clientTypes';

export function exportInvoicePdf(client: ErpClient, invoice: Invoice, lines: InvoiceLine[]): void {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Facture ${invoice.invoice_number ?? ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #111; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; border-bottom: 3px solid #dc2626; padding-bottom: 20px; margin-bottom: 30px; }
    .brand { font-size: 24px; font-weight: 900; color: #dc2626; }
    .brand span { color: #111; font-size: 12px; display: block; font-weight: normal; }
    .meta { text-align: right; font-size: 13px; color: #555; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .party h3 { font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 8px; }
    .party p { font-size: 13px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f5f5f5; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; }
    td { padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; }
    .totals { margin-left: auto; width: 280px; margin-top: 20px; }
    .totals tr td { border: none; padding: 4px 10px; }
    .totals .ttc { font-size: 18px; font-weight: bold; color: #dc2626; }
    .footer { margin-top: 40px; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 15px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">Z&amp;D Thermoliner<span>Transport &amp; Logistique</span></div>
    <div class="meta">
      <strong>Facture ${invoice.invoice_number ?? ''}</strong><br/>
      Date : ${new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}<br/>
      Échéance : ${new Date(invoice.due_date).toLocaleDateString('fr-FR')}
    </div>
  </div>
  <div class="parties">
    <div class="party">
      <h3>Émetteur</h3>
      <p><strong>Z&amp;D Thermoliner</strong><br/>Transport routier international<br/>France</p>
    </div>
    <div class="party">
      <h3>Client</h3>
      <p><strong>${client.name}</strong><br/>
      ${client.address ?? ''}${client.city ? `<br/>${client.postal_code ?? ''} ${client.city}` : ''}<br/>
      ${client.vat_number ? `TVA : ${client.vat_number}<br/>` : ''}
      ${client.siret ? `SIRET : ${client.siret}` : ''}</p>
    </div>
  </div>
  <table>
    <thead><tr><th>Description</th><th>Qté</th><th>P.U. HT</th><th>Total HT</th></tr></thead>
    <tbody>
      ${lines.map(l => `<tr>
        <td>${l.description}</td>
        <td>${l.quantity}</td>
        <td>${fmtEuro(l.unit_price)}</td>
        <td>${fmtEuro(l.amount_ht)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <table class="totals">
    <tr><td>Total HT</td><td style="text-align:right">${fmtEuro(invoice.amount_ht)}</td></tr>
    <tr><td>TVA (${invoice.vat_rate}%)</td><td style="text-align:right">${fmtEuro(invoice.vat_amount)}</td></tr>
    <tr class="ttc"><td><strong>Total TTC</strong></td><td style="text-align:right"><strong>${fmtEuro(invoice.amount_ttc)}</strong></td></tr>
  </table>
  ${invoice.notes ? `<p style="margin-top:20px;font-size:12px;color:#555"><em>${invoice.notes}</em></p>` : ''}
  <div class="footer">Z&amp;D Thermoliner ERP — Facture générée automatiquement</div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
