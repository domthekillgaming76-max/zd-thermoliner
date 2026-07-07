import type { Transaction } from './supabase';
import { isDebitTransaction, sumCredits, sumDebits } from './bankUtils';
import type { ChartDataPoint, ExpenseBreakdown } from '../types/dashboard';

export interface TransactionFinancials {
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netProfit: number;
  cashflow: number;
  revenueToday: number;
  revenueMonth: number;
  expensesMonth: number;
}

function postedTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.filter(t => !t.status || t.status === 'posted');
}

export function computeTransactionFinancials(
  transactions: Transaction[],
  accountBalance: number | null,
  month: string,
  today: string,
): TransactionFinancials {
  const posted = postedTransactions(transactions);
  const monthTx = posted.filter(t => t.date?.startsWith(month));
  const todayTx = posted.filter(t => t.date?.startsWith(today));

  const monthlyIncome = sumCredits(monthTx);
  const monthlyExpenses = sumDebits(monthTx);
  const netProfit = monthlyIncome - monthlyExpenses;
  const computedBalance = sumCredits(posted) - sumDebits(posted);

  return {
    balance: accountBalance != null ? accountBalance : computedBalance,
    monthlyIncome,
    monthlyExpenses,
    netProfit,
    cashflow: netProfit,
    revenueToday: sumCredits(todayTx),
    revenueMonth: monthlyIncome,
    expensesMonth: monthlyExpenses,
  };
}

export function computeExpenseBreakdownFromTransactions(
  transactions: Transaction[],
  month: string,
): ExpenseBreakdown {
  const monthTx = postedTransactions(transactions).filter(
    t => t.date?.startsWith(month) && isDebitTransaction(t),
  );

  const sumType = (...types: string[]) =>
    monthTx.filter(t => types.includes(t.type)).reduce((s, t) => s + Number(t.amount), 0);

  return {
    fuel: sumType('fuel'),
    tolls: sumType('toll'),
    repairs: sumType('maintenance'),
    salaries: sumType('salary'),
    other: sumType('expense', 'insurance', 'rent', 'tax', 'penalty'),
  };
}

export function buildMonthChartFromTransactions(transactions: Transaction[]): ChartDataPoint[] {
  const posted = postedTransactions(transactions);
  const months: ChartDataPoint[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('fr-FR', { month: 'short' });
    const mTx = posted.filter(t => t.date?.startsWith(key));
    const income = sumCredits(mTx);
    const expenses = sumDebits(mTx);
    months.push({ month: label, income, expenses, profit: income - expenses });
  }

  return months;
}

export function buildWeeklyRevenueFromTransactions(
  transactions: Transaction[],
): { day: string; label: string; revenue: number }[] {
  const posted = postedTransactions(transactions);
  const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const days: { day: string; label: string; revenue: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const dayTx = posted.filter(t => t.date?.startsWith(key));
    days.push({
      day: key,
      label: dayLabels[d.getDay()],
      revenue: sumCredits(dayTx),
    });
  }

  return days;
}
