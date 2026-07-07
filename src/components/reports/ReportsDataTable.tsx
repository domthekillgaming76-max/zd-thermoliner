interface ReportsDataTableProps {
  headers: string[];
  rows: (string | number)[][];
  loading?: boolean;
  emptyMessage?: string;
}

export function ReportsDataTable({ headers, rows, loading, emptyMessage }: ReportsDataTableProps) {
  if (loading) return <div className="reports-glass h-48 shimmer rounded-xl" />;

  if (!rows.length) {
    return (
      <div className="reports-glass rounded-xl p-10 text-center text-white/30 text-sm">
        {emptyMessage ?? 'Aucune donnée'}
      </div>
    );
  }

  return (
    <div className="reports-glass rounded-xl overflow-hidden border border-white/5">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              {headers.map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase text-white/35">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-white/3 hover:bg-white/[0.02] transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-2.5 text-white/75 whitespace-nowrap">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
