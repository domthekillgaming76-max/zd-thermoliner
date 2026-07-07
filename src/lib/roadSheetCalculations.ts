import type { DriverSalaryMode } from '../components/road-sheets/constants';
import type { RoadSheet } from './supabase';

export interface RoadSheetEconomics {
  revenue: number;
  fuelCost: number;
  tolls: number;
  repairs: number;
  expenses: number;
  driverSalary: number;
  profit: number;
}

export interface RoadSheetFullEconomics {
  revenue: number;
  fuelLiters: number;
  fuelCost: number;
  tollCost: number;
  repairCost: number;
  insuranceCost: number;
  otherExpenses: number;
  driverSalary: number;
  totalExpenses: number;
  netProfit: number;
  marginPercent: number;
  costPerKm: number;
}

export interface RoadSheetCalculationInput {
  km: number;
  pricePerKm: number;
  fuelConsumptionL100: number;
  fuelPricePerLiter: number;
  tollCost: number;
  repairCost: number;
  insuranceCost: number;
  otherExpenses: number;
  driverSalaryMode: DriverSalaryMode;
  driverSalaryValue: number;
}

export interface EconomyCoefficients {
  pricePerKm: number;
  fuelConsumptionL100: number;
  fuelPricePerLiter: number;
  tollCoeff: number;
  repairCoeff: number;
  expenseCoeff: number;
  driverSalaryCoeff: number;
}

export const DEFAULT_COEFFICIENTS: EconomyCoefficients = {
  pricePerKm: 1.8,
  fuelConsumptionL100: 32,
  fuelPricePerLiter: 1.85,
  tollCoeff: 0.12,
  repairCoeff: 0.08,
  expenseCoeff: 0.05,
  driverSalaryCoeff: 0.2,
};

export const DEFAULT_FORM_VALUES: RoadSheetCalculationInput = {
  km: 0,
  pricePerKm: 1.8,
  fuelConsumptionL100: 32,
  fuelPricePerLiter: 1.85,
  tollCost: 0,
  repairCost: 0,
  insuranceCost: 0,
  otherExpenses: 0,
  driverSalaryMode: 'percentage',
  driverSalaryValue: 20,
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateDriverSalary(
  input: Pick<RoadSheetCalculationInput, 'km' | 'driverSalaryMode' | 'driverSalaryValue'>,
  revenue: number,
): number {
  const km = Math.max(0, Number(input.km) || 0);
  const value = Math.max(0, Number(input.driverSalaryValue) || 0);

  switch (input.driverSalaryMode) {
    case 'fixed':
      return value;
    case 'percentage':
      return revenue * (value / 100);
    case 'per_km':
      return km * value;
    default:
      return 0;
  }
}

export function calculateRoadSheetFullEconomics(
  input: Partial<RoadSheetCalculationInput>,
): RoadSheetFullEconomics {
  const p = { ...DEFAULT_FORM_VALUES, ...input };
  const km = Math.max(0, Number(p.km) || 0);

  const revenue = round2(km * p.pricePerKm);
  const fuelLiters = round2((km * p.fuelConsumptionL100) / 100);
  const fuelCost = round2(fuelLiters * p.fuelPricePerLiter);
  const tollCost = round2(p.tollCost);
  const repairCost = round2(p.repairCost);
  const insuranceCost = round2(p.insuranceCost);
  const otherExpenses = round2(p.otherExpenses);
  const driverSalary = round2(calculateDriverSalary(p, revenue));

  const totalExpenses = round2(
    fuelCost + tollCost + repairCost + insuranceCost + otherExpenses + driverSalary,
  );
  const netProfit = round2(revenue - totalExpenses);
  const marginPercent = revenue > 0 ? round2((netProfit / revenue) * 100) : 0;
  const costPerKm = km > 0 ? round2(totalExpenses / km) : 0;

  return {
    revenue,
    fuelLiters,
    fuelCost,
    tollCost,
    repairCost,
    insuranceCost,
    otherExpenses,
    driverSalary,
    totalExpenses,
    netProfit,
    marginPercent,
    costPerKm,
  };
}

export function calculateRoadSheetEconomics(
  km: number,
  coefficients: Partial<EconomyCoefficients> = {},
  overrides: Partial<RoadSheetEconomics> = {},
): RoadSheetEconomics {
  const full = calculateRoadSheetFullEconomics({
    km,
    pricePerKm: coefficients.pricePerKm ?? DEFAULT_COEFFICIENTS.pricePerKm,
    fuelConsumptionL100: coefficients.fuelConsumptionL100 ?? DEFAULT_COEFFICIENTS.fuelConsumptionL100,
    fuelPricePerLiter: coefficients.fuelPricePerLiter ?? DEFAULT_COEFFICIENTS.fuelPricePerLiter,
    tollCost: overrides.tolls ?? (km * (coefficients.tollCoeff ?? DEFAULT_COEFFICIENTS.tollCoeff)),
    repairCost: overrides.repairs ?? (km * (coefficients.repairCoeff ?? DEFAULT_COEFFICIENTS.repairCoeff)),
    otherExpenses: overrides.expenses ?? (km * (coefficients.expenseCoeff ?? DEFAULT_COEFFICIENTS.expenseCoeff)),
    driverSalaryMode: 'percentage',
    driverSalaryValue: (coefficients.driverSalaryCoeff ?? DEFAULT_COEFFICIENTS.driverSalaryCoeff) * 100,
  });

  return {
    revenue: overrides.revenue ?? full.revenue,
    fuelCost: overrides.fuelCost ?? full.fuelCost,
    tolls: full.tollCost,
    repairs: full.repairCost,
    expenses: full.insuranceCost + full.otherExpenses,
    driverSalary: overrides.driverSalary ?? full.driverSalary,
    profit: overrides.profit ?? full.netProfit,
  };
}

export function extractRoadSheetEconomics(sheet: RoadSheet): RoadSheetEconomics {
  const full = extractRoadSheetFullEconomics(sheet);
  return {
    revenue: full.revenue,
    fuelCost: full.fuelCost,
    tolls: full.tollCost,
    repairs: full.repairCost,
    expenses: full.insuranceCost + full.otherExpenses,
    driverSalary: full.driverSalary,
    profit: full.netProfit,
  };
}

export function extractRoadSheetFullEconomics(sheet: RoadSheet): RoadSheetFullEconomics {
  const km = Number(sheet.km || sheet.total_distance || 0);
  const hasStored =
    sheet.economics_calculated ||
    sheet.net_profit != null ||
    sheet.fuel_cost != null ||
    sheet.total_expenses != null;

  if (hasStored) {
    const revenue = Number(sheet.revenue || 0);
    const fuelLiters = Number(sheet.fuel_liters || (km * Number(sheet.fuel_consumption_l100 || 32) / 100));
    const fuelCost = Number(sheet.fuel_cost || 0);
    const tollCost = Number(sheet.toll_cost ?? sheet.toll_cost_calc ?? 0);
    const repairCost = Number(sheet.repair_cost ?? sheet.wear_cost ?? 0);
    const insuranceCost = Number(sheet.insurance_cost || 0);
    const otherExpenses = Number(sheet.other_expenses || 0);
    const driverSalary = Number(sheet.driver_salary ?? sheet.driver_bonus ?? 0);
    const totalExpenses = Number(
      sheet.total_expenses ||
        fuelCost + tollCost + repairCost + insuranceCost + otherExpenses + driverSalary,
    );
    const netProfit = Number(sheet.net_profit ?? revenue - totalExpenses);
    const marginPercent = Number(
      sheet.margin_percent ?? (revenue > 0 ? (netProfit / revenue) * 100 : 0),
    );
    const costPerKm = Number(sheet.cost_per_km ?? (km > 0 ? totalExpenses / km : 0));

    return {
      revenue,
      fuelLiters: round2(fuelLiters),
      fuelCost,
      tollCost,
      repairCost,
      insuranceCost,
      otherExpenses,
      driverSalary,
      totalExpenses,
      netProfit,
      marginPercent: round2(marginPercent),
      costPerKm: round2(costPerKm),
    };
  }

  return calculateRoadSheetFullEconomics({
    km,
    pricePerKm: Number(sheet.price_per_km || DEFAULT_COEFFICIENTS.pricePerKm),
    fuelConsumptionL100: Number(sheet.fuel_consumption_l100 || DEFAULT_COEFFICIENTS.fuelConsumptionL100),
    fuelPricePerLiter: Number(sheet.fuel_price_per_liter || DEFAULT_COEFFICIENTS.fuelPricePerLiter),
    tollCost: Number(sheet.toll_cost ?? sheet.toll_cost_calc ?? 0),
    repairCost: Number(sheet.repair_cost ?? sheet.wear_cost ?? 0),
    insuranceCost: Number(sheet.insurance_cost || 0),
    otherExpenses: Number(sheet.other_expenses || 0),
    driverSalaryMode: (sheet.driver_salary_mode as DriverSalaryMode) || 'percentage',
    driverSalaryValue: Number(sheet.driver_salary_value ?? 20),
  });
}

export function aggregateRoadSheetEconomics(sheets: RoadSheet[]): RoadSheetEconomics {
  return sheets.reduce<RoadSheetEconomics>(
    (acc, sheet) => {
      const e = extractRoadSheetEconomics(sheet);
      return {
        revenue: acc.revenue + e.revenue,
        fuelCost: acc.fuelCost + e.fuelCost,
        tolls: acc.tolls + e.tolls,
        repairs: acc.repairs + e.repairs,
        expenses: acc.expenses + e.expenses,
        driverSalary: acc.driverSalary + e.driverSalary,
        profit: acc.profit + e.profit,
      };
    },
    { revenue: 0, fuelCost: 0, tolls: 0, repairs: 0, expenses: 0, driverSalary: 0, profit: 0 },
  );
}

export function economicsToDbPayload(economics: RoadSheetFullEconomics) {
  return {
    revenue: economics.revenue,
    fuel_liters: economics.fuelLiters,
    fuel_cost: economics.fuelCost,
    toll_cost: economics.tollCost,
    toll_cost_calc: economics.tollCost,
    repair_cost: economics.repairCost,
    insurance_cost: economics.insuranceCost,
    other_expenses: economics.otherExpenses,
    driver_salary: economics.driverSalary,
    total_expenses: economics.totalExpenses,
    net_profit: economics.netProfit,
    margin_percent: economics.marginPercent,
    cost_per_km: economics.costPerKm,
    economics_calculated: true,
  };
}
