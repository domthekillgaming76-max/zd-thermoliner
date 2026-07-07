import type { ElementType } from 'react';
import { fmtEuro, fmtDateTime } from '../../lib/format';

export interface ActivityItem {
  id: string;
  title: string;
  description?: string;
  amount?: number;
  amountType?: 'income' | 'expense' | 'neutral';
  timestamp: string;
  status?: 'success' | 'warning' | 'pending' | 'error' | 'info';
  icon?: ElementType;
}

const STATUS_DOT: Record<string, string> = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400 animate-pulse',
  pending: 'bg-amber-400 animate-pulse',
  error: 'bg-red-400',
  info: 'bg-blue-400',
};

interface ActivityFeedProps {
  items: ActivityItem[];
  loading?: boolean;
  emptyMessage?: string;
}

export function ActivityFeed({ items, loading, emptyMessage = 'Aucune activité récente' }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-14 rounded-xl shimmer" style={{ background: 'rgba(255,255,255,0.03)' }} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-white/25 text-sm text-center py-8">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-1">
      {items.map(item => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/[0.03]"
            style={{ border: '1px solid rgba(255,255,255,0.04)' }}
          >
            {Icon ? (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/[0.04]">
                <Icon className="w-4 h-4 text-white/50" />
              </div>
            ) : item.status ? (
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[item.status] ?? 'bg-white/30'}`} />
            ) : null}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{item.title}</p>
              {item.description && (
                <p className="text-[10px] text-white/30 truncate">{item.description}</p>
              )}
              <p className="text-[10px] text-white/20 mt-0.5">{fmtDateTime(item.timestamp)}</p>
            </div>
            {item.amount != null && (
              <span
                className={`text-xs font-bold flex-shrink-0 ${
                  item.amountType === 'income'
                    ? 'text-emerald-400'
                    : item.amountType === 'expense'
                      ? 'text-red-400'
                      : 'text-white/50'
                }`}
              >
                {item.amountType === 'income' ? '+' : item.amountType === 'expense' ? '-' : ''}
                {fmtEuro(Math.abs(item.amount))}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
