export const SALON_COLUMNS = [
  'ERP',
  'Communauté',
  'Finance',
  'Administration',
  'Chauffeurs',
  'Autres',
] as const;

export type SalonColumn = typeof SALON_COLUMNS[number];

const COLUMN_ALIASES: Record<string, SalonColumn> = {
  Compte: 'Autres',
  Recrutement: 'Autres',
};

const FINANCE_MODULE_KEYS = new Set([
  'finance', 'invoices', 'salaries', 'accounting', 'bank',
]);

const DRIVER_MODULE_KEYS = new Set([
  'drivers', 'driver_portal', 'road_sheets', 'clovis_rental',
]);

export function resolveSalonColumn(category: string, moduleKey?: string): SalonColumn {
  const trimmed = category.trim();
  if ((SALON_COLUMNS as readonly string[]).includes(trimmed)) {
    return trimmed as SalonColumn;
  }
  if (COLUMN_ALIASES[trimmed]) return COLUMN_ALIASES[trimmed];
  if (moduleKey && FINANCE_MODULE_KEYS.has(moduleKey)) return 'Finance';
  if (moduleKey && DRIVER_MODULE_KEYS.has(moduleKey)) return 'Chauffeurs';
  if (/finance|factur|salaire|comptab|banque/i.test(trimmed)) return 'Finance';
  if (/chauffeur|driver|route/i.test(trimmed)) return 'Chauffeurs';
  if (/admin/i.test(trimmed)) return 'Administration';
  if (/commun|mur|wall|event|update/i.test(trimmed)) return 'Communauté';
  return 'Autres';
}

export function buildColumnMap<T extends { id: string; draftCategory: string; key: string; sort_order: number }>(
  rows: T[],
): Record<SalonColumn, T[]> {
  const map = Object.fromEntries(SALON_COLUMNS.map(c => [c, [] as T[]])) as Record<SalonColumn, T[]>;
  for (const row of rows) {
    const col = resolveSalonColumn(row.draftCategory, row.key);
    map[col].push(row);
  }
  for (const col of SALON_COLUMNS) {
    map[col].sort((a, b) => a.sort_order - b.sort_order);
  }
  return map;
}

export function columnMapToUpdates(
  columns: Record<string, string[]>,
): Array<{ id: string; category: string; sort_order: number }> {
  const updates: Array<{ id: string; category: string; sort_order: number }> = [];
  for (const [category, ids] of Object.entries(columns)) {
    ids.forEach((id, index) => {
      updates.push({ id, category, sort_order: (index + 1) * 10 });
    });
  }
  return updates;
}

export function columnDroppableId(column: string): string {
  return `column:${column}`;
}

export function parseColumnDroppableId(id: string): string | null {
  return id.startsWith('column:') ? id.slice(7) : null;
}
