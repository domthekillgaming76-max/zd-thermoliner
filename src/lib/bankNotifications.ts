import type { Transaction } from './supabase';
import { isCreditTransaction, isDebitTransaction } from './bankUtils';
import type { FleetLoan } from '../services/bankFinancingService';

export type BankNotificationType =
  | 'incoming_payment'
  | 'outgoing_payment'
  | 'road_sheet_validated'
  | 'salary_paid'
  | 'loan_payment';

export interface BankNotification {
  id: string;
  type: BankNotificationType;
  title: string;
  message: string;
  amount?: number;
  createdAt: string;
  read: boolean;
}

export function buildBankNotifications(
  transactions: Transaction[],
  pendingRoadSheets: number,
  loans: FleetLoan[],
): BankNotification[] {
  const items: BankNotification[] = [];

  for (const tx of transactions.slice(0, 12)) {
    const amount = Number(tx.amount);
    if (isCreditTransaction(tx)) {
      items.push({
        id: `in-${tx.id}`,
        type: 'incoming_payment',
        title: 'Encaissement reçu',
        message: tx.description ?? 'Crédit sur compte',
        amount,
        createdAt: tx.created_at,
        read: false,
      });
    } else if (isDebitTransaction(tx)) {
      const type: BankNotificationType =
        tx.type === 'salary' ? 'salary_paid' : 'outgoing_payment';
      items.push({
        id: `out-${tx.id}`,
        type,
        title: type === 'salary_paid' ? 'Salaire versé' : 'Décaissement',
        message: tx.description ?? 'Débit sur compte',
        amount,
        createdAt: tx.created_at,
        read: false,
      });
    }

    if (tx.auto_generated && tx.road_sheet_id) {
      items.push({
        id: `rs-${tx.id}`,
        type: 'road_sheet_validated',
        title: 'Feuille de route comptabilisée',
        message: tx.description ?? 'Synchronisation bancaire automatique',
        amount,
        createdAt: tx.created_at,
        read: true,
      });
    }
  }

  if (pendingRoadSheets > 0) {
    items.unshift({
      id: 'pending-sheets',
      type: 'road_sheet_validated',
      title: 'Feuilles en attente',
      message: `${pendingRoadSheets} feuille(s) à valider pour comptabilisation`,
      createdAt: new Date().toISOString(),
      read: false,
    });
  }

  for (const loan of loans.filter(l => l.status === 'active').slice(0, 3)) {
    items.push({
      id: `loan-${loan.id}`,
      type: 'loan_payment',
      title: 'Échéance crédit flotte',
      message: `${loan.asset_name} — mensualité à prévoir`,
      amount: loan.monthly_payment,
      createdAt: loan.updated_at ?? loan.created_at,
      read: false,
    });
  }

  return items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15);
}
