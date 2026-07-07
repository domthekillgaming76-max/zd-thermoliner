export type ReportTabId =
  | 'overview'
  | 'finance'
  | 'drivers'
  | 'fleet'
  | 'road_sheets'
  | 'invoices';

export type ReportExportType =
  | 'overview'
  | 'finance'
  | 'drivers'
  | 'fleet'
  | 'road_sheets'
  | 'invoices';

export interface MonthlyFinancePoint {
  month: string;
  label: string;
  income: number;
  expenses: number;
  profit: number;
}

export interface DriverReportRow {
  id: string;
  name: string;
  roadSheets: number;
  revenue: number;
  expenses: number;
  profit: number;
  missions: number;
}

export interface FleetReportRow {
  id: string;
  label: string;
  status: string;
  mileage: number;
  totalCost: number;
  revenue: number;
  profit: number;
}

export interface RoadSheetReportRow {
  id: string;
  driverName: string;
  route: string;
  date: string;
  status: string;
  revenue: number;
  netProfit: number;
}

export interface InvoiceReportRow {
  id: string;
  number: string;
  clientName: string;
  dueDate: string;
  amountTtc: number;
  status: string;
}

export interface ReportsDashboard {
  companyBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyProfit: number;
  totalDrivers: number;
  activeTrucks: number;
  pendingRoadSheets: number;
  lateInvoices: number;
  validatedRoadSheets: number;
  fleetProfitability: number;
}

export interface ReportsBundle {
  dashboard: ReportsDashboard;
  monthlyFinance: MonthlyFinancePoint[];
  drivers: DriverReportRow[];
  fleet: FleetReportRow[];
  roadSheets: RoadSheetReportRow[];
  invoices: InvoiceReportRow[];
  migrationRequired: boolean;
}

export const REPORT_TAB_LABELS: Record<ReportTabId, string> = {
  overview: "Vue d'ensemble",
  finance: 'Finances',
  drivers: 'Chauffeurs',
  fleet: 'Flotte',
  road_sheets: 'Feuilles de route',
  invoices: 'Factures',
};

export function formatReportCurrency(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}
