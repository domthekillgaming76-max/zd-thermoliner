export const fmt = (n: number) =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

export const fmtEuro = (n: number) =>
  `${n >= 0 ? '' : '-'}${Math.abs(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;

export const fmtDecimal = (n: number, digits = 2) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fmtDate = (date: string) =>
  new Date(date).toLocaleDateString('fr-FR');

export const fmtDateTime = (date: string) =>
  new Date(date).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export const todayKey = () => new Date().toISOString().split('T')[0];

export const monthKey = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
