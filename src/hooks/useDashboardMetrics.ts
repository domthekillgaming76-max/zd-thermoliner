import { useMemo } from 'react';
import type { DashboardData, DashboardStats, DashboardTrends } from '../types/dashboard';

export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  rawValue: number;
  change?: number;
  changeLabel?: string;
  color: string;
  glow: string;
  to?: string;
  highlight?: boolean;
}

function formatTrend(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

export function useDashboardMetrics(
  stats: DashboardStats,
  trends: DashboardTrends,
  fmtEuro: (n: number) => string,
  canAccessBankModule = false,
): DashboardMetric[] {
  return useMemo(
    () => [
      {
        id: 'revenue-today',
        label: 'Revenus du jour',
        value: fmtEuro(stats.revenueToday),
        rawValue: stats.revenueToday,
        change: trends.revenueTodayChange,
        changeLabel: formatTrend(trends.revenueTodayChange),
        color: '#34d399',
        glow: 'rgba(52,211,153,0.25)',
        to: '/finance',
      },
      {
        id: 'revenue-month',
        label: 'Revenus du mois',
        value: fmtEuro(stats.revenueMonth),
        rawValue: stats.revenueMonth,
        change: trends.revenueMonthChange,
        changeLabel: formatTrend(trends.revenueMonthChange),
        color: '#60a5fa',
        glow: 'rgba(96,165,250,0.25)',
        to: '/finance',
      },
      {
        id: 'balance',
        label: 'Solde entreprise',
        value: fmtEuro(stats.companyBalance),
        rawValue: stats.companyBalance,
        color: '#a78bfa',
        glow: 'rgba(167,139,250,0.25)',
        to: canAccessBankModule ? '/bank' : '/finance',
        highlight: true,
      },
      {
        id: 'profit',
        label: 'Bénéfice net',
        value: fmtEuro(stats.netProfit),
        rawValue: stats.netProfit,
        change: trends.profitMargin,
        changeLabel: `${trends.profitMargin.toFixed(1)}% marge`,
        color: stats.netProfit >= 0 ? '#34d399' : '#f87171',
        glow: stats.netProfit >= 0 ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)',
        to: '/finance',
        highlight: true,
      },
      {
        id: 'drivers',
        label: 'Chauffeurs actifs',
        value: String(stats.driverCount),
        rawValue: stats.driverCount,
        color: '#22d3ee',
        glow: 'rgba(34,211,238,0.25)',
        to: '/drivers',
      },
      {
        id: 'trucks',
        label: 'Camions disponibles',
        value: String(stats.trucksAvailable),
        rawValue: stats.trucksAvailable,
        change: trends.fleetUtilization,
        changeLabel: `${trends.fleetUtilization.toFixed(0)}% utilisation`,
        color: '#fbbf24',
        glow: 'rgba(251,191,36,0.25)',
        to: '/fleet',
      },
      {
        id: 'pending',
        label: 'Feuilles en attente',
        value: String(stats.pendingRoadSheets),
        rawValue: stats.pendingRoadSheets,
        color: '#fb923c',
        glow: 'rgba(251,146,60,0.25)',
        to: '/road-sheets',
      },
      {
        id: 'deliveries',
        label: 'Livraisons validées',
        value: String(stats.deliveriesCompleted),
        rawValue: stats.deliveriesCompleted,
        change: trends.validationRate,
        changeLabel: `${trends.validationRate.toFixed(0)}% validées`,
        color: '#4ade80',
        glow: 'rgba(74,222,128,0.25)',
        to: '/road-sheets',
      },
    ],
    [stats, trends, fmtEuro, canAccessBankModule],
  );
}

export function useExecutiveHighlights(data: DashboardData, fmtEuro: (n: number) => string) {
  return useMemo(
    () => [
      {
        label: 'Chiffre du mois',
        value: fmtEuro(data.stats.revenueMonth),
        sub: `${data.trends.revenueMonthChange >= 0 ? '+' : ''}${data.trends.revenueMonthChange.toFixed(1)}% vs mois précédent`,
        positive: data.trends.revenueMonthChange >= 0,
      },
      {
        label: 'Marge nette',
        value: `${data.trends.profitMargin.toFixed(1)}%`,
        sub: `Bénéfice ${fmtEuro(data.stats.netProfit)}`,
        positive: data.stats.netProfit >= 0,
      },
      {
        label: 'Flotte opérationnelle',
        value: `${data.fleetStatus.active}/${data.fleetStatus.total}`,
        sub: `${data.fleetStatus.available} camions libres`,
        positive: data.fleetStatus.available > 0,
      },
      {
        label: 'Activité du jour',
        value: String(data.operational.completedToday),
        sub: `${data.operational.pendingValidations} en attente de validation`,
        positive: data.operational.pendingValidations === 0,
      },
    ],
    [data, fmtEuro],
  );
}
