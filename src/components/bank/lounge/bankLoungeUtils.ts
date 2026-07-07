import type { CompanyBankAccount } from '../../../lib/supabase';

export function downloadRib(account: CompanyBankAccount | null): void {
  const name = account?.account_name ?? 'Z&D Thermoliner';
  const iban = account?.iban_rp ?? 'FR76 3000 2999 0000 0000 0000 000';
  const bic = 'ZDTFRPPXXX';
  const content = [
    "RELEVÉ D'IDENTITÉ BANCAIRE — Z&D Thermoliner",
    '==========================================',
    '',
    `Titulaire : ${name}`,
    `IBAN : ${iban}`,
    `BIC : ${bic}`,
    'Banque : Espace Banque Z&D Thermoliner',
    '',
    `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RIB-ZD-Thermoliner-${new Date().toISOString().split('T')[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printBankStatement(
  account: CompanyBankAccount | null,
  transactions: Array<{
    date: string;
    description: string | null;
    type: string;
    amount: number;
    category: string | null;
  }>,
  summary: {
    balance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    netCashflow: number;
  },
): void {
  const name = account?.account_name ?? 'Z&D Thermoliner';
  const iban = account?.iban_rp ?? '—';
  const rows = transactions
    .slice(0, 50)
    .map(
      t =>
        `<tr>
          <td>${new Date(t.date).toLocaleDateString('fr-FR')}</td>
          <td>${t.description ?? t.type}</td>
          <td>${t.category ?? ''}</td>
          <td style="text-align:right">${Number(t.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
        </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relevé Z&D Thermoliner</title>
    <style>
      body{font-family:Inter,system-ui,sans-serif;padding:32px;color:#003D24}
      h1{font-size:20px;color:#006B3F}
      table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px}
      th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}
      th{background:#e8f5ef;color:#006B3F}
      .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}
      .box{background:#f0faf5;padding:12px;border-radius:8px}
      .box strong{display:block;font-size:11px;color:#1F8A70}
    </style></head><body>
    <h1>Relevé de compte — Z&D Thermoliner</h1>
    <p><strong>${name}</strong><br>IBAN : ${iban}<br>Date : ${new Date().toLocaleDateString('fr-FR')}</p>
    <div class="summary">
      <div class="box"><strong>Solde</strong>${summary.balance.toLocaleString('fr-FR')} €</div>
      <div class="box"><strong>Revenus</strong>${summary.monthlyIncome.toLocaleString('fr-FR')} €</div>
      <div class="box"><strong>Dépenses</strong>${summary.monthlyExpenses.toLocaleString('fr-FR')} €</div>
      <div class="box"><strong>Flux net</strong>${summary.netCashflow.toLocaleString('fr-FR')} €</div>
    </div>
    <table><thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th>Montant</th></tr></thead><tbody>${rows}</tbody></table>
    </body></html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
