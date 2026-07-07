import type { Truck } from './supabase';

export type TruckStatus = 'active' | 'maintenance' | 'retired';

export type MaintenanceType = 'oil' | 'tires' | 'brakes' | 'engine' | 'transmission' | 'other';

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type TruckDocType = 'insurance' | 'inspection' | 'registration' | 'maintenance' | 'other';

export interface FleetTruck extends Truck {
  vin: string | null;
  year: number | null;
  fuel_consumption: number;
  trailer_id: string | null;
  insurance_date: string | null;
  technical_inspection_date: string | null;
  updated_at: string | null;
  driver_name?: string | null;
  trailer_label?: string | null;
  garage_name?: string | null;
}

export interface TruckCosts {
  truck_id: string;
  purchase_value: number;
  monthly_insurance: number;
  monthly_tax: number;
  last_maintenance_cost: number;
  last_maintenance_date: string | null;
  next_maintenance_km: number;
  mechanical_state: number;
  total_revenue: number;
  total_cost: number;
  total_km: number;
  updated_at: string | null;
}

export interface FleetMaintenance {
  id: string;
  truck_id: string;
  maintenance_type: MaintenanceType;
  title: string;
  description: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  estimated_cost: number;
  actual_cost: number;
  status: MaintenanceStatus;
  validated: boolean;
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
}

export interface TruckAssignment {
  id: string;
  truck_id: string;
  driver_id: string | null;
  trailer_id: string | null;
  garage_id: string | null;
  assigned_at: string;
  unassigned_at: string | null;
  notes: string | null;
  driver_name?: string | null;
  trailer_label?: string | null;
  garage_name?: string | null;
}

export interface TruckDocument {
  id: string;
  truck_id: string;
  doc_type: TruckDocType;
  file_url: string | null;
  file_name: string | null;
  expires_at: string | null;
  status: string;
  uploaded_at: string;
  notes: string | null;
}

export interface FleetDashboardStats {
  totalTrucks: number;
  availableTrucks: number;
  inServiceTrucks: number;
  maintenanceTrucks: number;
  retiredTrucks: number;
  averageMileage: number;
  monthlyFleetCost: number;
  fleetProfitability: number;
  maintenanceAlerts: number;
}

export interface TruckCostBreakdown {
  fuelCost: number;
  repairCost: number;
  insuranceCost: number;
  maintenanceCost: number;
  costPerKm: number;
  profitability: number;
  revenue: number;
}

export const TRUCK_STATUS_LABELS: Record<TruckStatus, { label: string; color: string }> = {
  active: { label: 'En service', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  maintenance: { label: 'Maintenance', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  retired: { label: 'Retiré', color: 'text-white/30 bg-white/5 border-white/10' },
};

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  oil: 'Vidange',
  tires: 'Pneus',
  brakes: 'Freins',
  engine: 'Moteur',
  transmission: 'Transmission',
  other: 'Autre',
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  scheduled: 'Planifié',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

export const MAINTENANCE_STATUS_STYLES: Record<MaintenanceStatus, string> = {
  scheduled: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
  in_progress: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  cancelled: 'text-white/30 bg-white/5 border-white/10',
};

export function computeFleetDashboard(trucks: FleetTruck[], costs: TruckCosts[]): FleetDashboardStats {
  const total = trucks.length;
  const active = trucks.filter(t => t.status === 'active');
  const available = active.filter(t => !t.driver_id);
  const inService = active.filter(t => !!t.driver_id);
  const maintenance = trucks.filter(t => t.status === 'maintenance').length;
  const retired = trucks.filter(t => t.status === 'retired').length;
  const avgMileage = total > 0 ? Math.round(trucks.reduce((s, t) => s + t.mileage, 0) / total) : 0;

  const monthlyFleetCost = costs.reduce(
    (s, c) => s + Number(c.monthly_insurance) + Number(c.monthly_tax) + Number(c.last_maintenance_cost),
    0,
  );
  const fleetProfitability = costs.reduce(
    (s, c) => s + Number(c.total_revenue) - Number(c.total_cost),
    0,
  );

  const today = new Date();
  const maintenanceAlerts = costs.filter(c => {
    if (!c.last_maintenance_date) return false;
    const next = new Date(c.last_maintenance_date);
    next.setMonth(next.getMonth() + 6);
    return next <= today;
  }).length;

  return {
    totalTrucks: total,
    availableTrucks: available.length,
    inServiceTrucks: inService.length,
    maintenanceTrucks: maintenance,
    retiredTrucks: retired,
    averageMileage: avgMileage,
    monthlyFleetCost: Math.round(monthlyFleetCost * 100) / 100,
    fleetProfitability: Math.round(fleetProfitability * 100) / 100,
    maintenanceAlerts,
  };
}

export function computeTruckCosts(
  costs: TruckCosts | null,
  maintenanceRecords: FleetMaintenance[],
  truckMileage: number,
): TruckCostBreakdown {
  const repairCost = maintenanceRecords
    .filter(m => m.status === 'completed')
    .reduce((s, m) => s + Number(m.actual_cost), 0);
  const maintenanceCost = repairCost + Number(costs?.last_maintenance_cost ?? 0);
  const insuranceCost = Number(costs?.monthly_insurance ?? 0) * 12;
  const fuelCost = Math.max(0, Number(costs?.total_cost ?? 0) - maintenanceCost - insuranceCost);
  const revenue = Number(costs?.total_revenue ?? 0);
  const totalCost = Number(costs?.total_cost ?? 0) + repairCost;
  const km = truckMileage || costs?.total_km || 1;

  return {
    fuelCost: Math.round(fuelCost * 100) / 100,
    repairCost: Math.round(repairCost * 100) / 100,
    insuranceCost: Math.round(insuranceCost * 100) / 100,
    maintenanceCost: Math.round(maintenanceCost * 100) / 100,
    costPerKm: Math.round((totalCost / km) * 100) / 100,
    profitability: Math.round((revenue - totalCost) * 100) / 100,
    revenue: Math.round(revenue * 100) / 100,
  };
}

export function getMaintenanceAlerts(
  trucks: FleetTruck[],
  maintenance: FleetMaintenance[],
): { truckId: string; truckLabel: string; message: string; urgency: 'high' | 'medium' }[] {
  const alerts: { truckId: string; truckLabel: string; message: string; urgency: 'high' | 'medium' }[] = [];
  const today = new Date();

  for (const truck of trucks) {
    const label = [truck.brand, truck.model, truck.registration].filter(Boolean).join(' ');

    if (truck.insurance_date) {
      const exp = new Date(truck.insurance_date);
      const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
      if (days <= 30) alerts.push({ truckId: truck.id, truckLabel: label, message: `Assurance expire dans ${days}j`, urgency: days <= 7 ? 'high' : 'medium' });
    }
    if (truck.technical_inspection_date) {
      const exp = new Date(truck.technical_inspection_date);
      const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
      if (days <= 30) alerts.push({ truckId: truck.id, truckLabel: label, message: `Contrôle technique dans ${days}j`, urgency: days <= 7 ? 'high' : 'medium' });
    }
  }

  for (const m of maintenance.filter(r => r.status === 'scheduled' && r.scheduled_date)) {
    const truck = trucks.find(t => t.id === m.truck_id);
    const label = truck ? [truck.brand, truck.registration].filter(Boolean).join(' ') : m.truck_id.slice(0, 8);
    const days = Math.ceil((new Date(m.scheduled_date!).getTime() - today.getTime()) / 86400000);
    if (days <= 14) {
      alerts.push({
        truckId: m.truck_id,
        truckLabel: label,
        message: `${MAINTENANCE_TYPE_LABELS[m.maintenance_type]} — ${m.title}`,
        urgency: days <= 3 ? 'high' : 'medium',
      });
    }
  }

  return alerts.sort((a) => (a.urgency === 'high' ? -1 : 1));
}
