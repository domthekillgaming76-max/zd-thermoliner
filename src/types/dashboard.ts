import type { Driver, RoadSheet, Transaction, Truck } from '../lib/supabase';

export interface DashboardNotification {
  id: string;
  title: string;
  message: string | null;
  read: boolean;
  type: string;
  created_at: string;
}

export interface DashboardStats {
  revenueToday: number;
  revenueMonth: number;
  companyBalance: number;
  netProfit: number;
  expensesMonth: number;
  driverCount: number;
  trucksAvailable: number;
  pendingRoadSheets: number;
  deliveriesCompleted: number;
}

export interface DashboardTrends {
  revenueTodayChange: number;
  revenueMonthChange: number;
  profitMargin: number;
  fleetUtilization: number;
  validationRate: number;
  expenseRatio: number;
}

export interface ExpenseBreakdown {
  fuel: number;
  tolls: number;
  repairs: number;
  salaries: number;
  other: number;
}

export interface OperationalMetrics {
  avgRevenuePerDelivery: number;
  totalKmMonth: number;
  activeAssignments: number;
  pendingValidations: number;
  completedToday: number;
}

export interface WeeklyDataPoint {
  day: string;
  label: string;
  deliveries: number;
  revenue: number;
}

export interface FleetStatus {
  total: number;
  active: number;
  maintenance: number;
  retired: number;
  available: number;
}

export interface ChartDataPoint {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

export interface DashboardData {
  stats: DashboardStats;
  trends: DashboardTrends;
  expenseBreakdown: ExpenseBreakdown;
  operational: OperationalMetrics;
  weeklyData: WeeklyDataPoint[];
  fleetStatus: FleetStatus;
  monthData: ChartDataPoint[];
  recentRoadSheets: RoadSheet[];
  recentTransactions: Transaction[];
  notifications: DashboardNotification[];
  maintenanceTrucks: Truck[];
  topDrivers: Driver[];
  trucks: Truck[];
  drivers: Driver[];
}
