import { Bell, CheckCircle2, ArrowDownLeft, ArrowUpRight, FileCheck, Banknote, CreditCard } from 'lucide-react';
import { formatCurrency } from '../../../lib/bankUtils';
import type { BankNotification } from '../../../lib/bankNotifications';
import { BankGlassPanel } from './BankGlassPanel';

const ICONS = {
  incoming_payment: ArrowDownLeft,
  outgoing_payment: ArrowUpRight,
  road_sheet_validated: FileCheck,
  salary_paid: Banknote,
  loan_payment: CreditCard,
};

const COLORS = {
  incoming_payment: '#3EBFA0',
  outgoing_payment: '#D66B6B',
  road_sheet_validated: '#60a5fa',
  salary_paid: '#f0b429',
  loan_payment: '#a78bfa',
};

interface BankNotificationsPanelProps {
  notifications: BankNotification[];
  compact?: boolean;
}

export function BankNotificationsPanel({ notifications, compact }: BankNotificationsPanelProps) {
  const items = compact ? notifications.slice(0, 5) : notifications;

  return (
    <BankGlassPanel className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 bank-lounge-accent-icon" />
        <h2 className="text-sm font-bold text-white">Notifications bancaires</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40">
          {notifications.filter(n => !n.read).length} nouvelles
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-white/30 py-6 text-center">Aucune notification</p>
      ) : (
        <ul className="space-y-2">
          {items.map(n => {
            const Icon = ICONS[n.type];
            const color = COLORS[n.type];
            return (
              <li
                key={n.id}
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors"
                style={{ borderLeft: `3px solid ${color}` }}
              >
                <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{n.title}</p>
                  <p className="text-xs text-white/40 truncate">{n.message}</p>
                  {n.amount != null && (
                    <p className="text-xs font-bold mt-0.5" style={{ color }}>
                      {formatCurrency(n.amount)} €
                    </p>
                  )}
                </div>
                {!n.read && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </BankGlassPanel>
  );
}
