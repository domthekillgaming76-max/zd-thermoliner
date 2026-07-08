export interface MonthlyKmPoint {
  month: string;
  km: number;
}

export interface DriverRevenueRow {
  driverId: string;
  driverName: string;
  revenue: number;
  deliveries: number;
  km: number;
}

export interface RouteProfitRow {
  route: string;
  revenue: number;
  profit: number;
  deliveries: number;
  marginPercent: number;
}

export interface FuelEstimate {
  monthLiters: number;
  monthCost: number;
  avgConsumptionL100: number;
  kmMonth: number;
}

export interface MarginEvolutionPoint {
  month: string;
  marginPercent: number;
  revenue: number;
  profit: number;
}

export interface StatisticsBundle {
  monthlyKm: MonthlyKmPoint[];
  revenueByDriver: DriverRevenueRow[];
  profitByRoute: RouteProfitRow[];
  fuelEstimate: FuelEstimate;
  bestDrivers: DriverRevenueRow[];
  bestRoutes: RouteProfitRow[];
  marginEvolution: MarginEvolutionPoint[];
}
