import { supabase } from '../lib/supabase';
import { logSupabaseError } from '../lib/transactionSchema';

export interface FleetLoan {
  id: string;
  asset_type: 'truck' | 'trailer';
  asset_name: string;
  lender: string;
  principal: number;
  remaining_capital: number;
  monthly_payment: number;
  interest_rate: number;
  start_date: string | null;
  end_date: string | null;
  status: 'active' | 'paid' | 'default';
  truck_id: string | null;
  created_at: string;
  updated_at: string;
}

const FALLBACK_LOANS: FleetLoan[] = [
  {
    id: 'fallback-truck-1',
    asset_type: 'truck',
    asset_name: 'Renault T High 520',
    lender: 'Crédit Flotte Z&D',
    principal: 98000,
    remaining_capital: 70560,
    monthly_payment: 1764,
    interest_rate: 3.2,
    start_date: '2024-03-01',
    end_date: '2027-03-01',
    status: 'active',
    truck_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'fallback-trailer-1',
    asset_type: 'trailer',
    asset_name: 'Semi-remorque frigo',
    lender: 'Crédit Flotte Z&D',
    principal: 42000,
    remaining_capital: 30240,
    monthly_payment: 756,
    interest_rate: 2.9,
    start_date: '2023-06-01',
    end_date: '2027-06-01',
    status: 'active',
    truck_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export interface FleetFinancingSummary {
  loans: FleetLoan[];
  totalRemaining: number;
  totalMonthly: number;
  truckCount: number;
  trailerCount: number;
}

export async function fetchFleetLoans(): Promise<FleetLoan[]> {
  const { data, error } = await supabase
    .from('fleet_loans')
    .select('*')
    .order('asset_type', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    logSupabaseError('fetchFleetLoans', error);
    return FALLBACK_LOANS;
  }

  const rows = (data ?? []) as FleetLoan[];
  return rows.length > 0 ? rows.map(normalizeLoan) : FALLBACK_LOANS;
}

function normalizeLoan(row: FleetLoan): FleetLoan {
  return {
    ...row,
    principal: Number(row.principal),
    remaining_capital: Number(row.remaining_capital),
    monthly_payment: Number(row.monthly_payment),
    interest_rate: Number(row.interest_rate),
  };
}

export function summarizeFleetFinancing(loans: FleetLoan[]): FleetFinancingSummary {
  const active = loans.filter(l => l.status === 'active');
  return {
    loans: active,
    totalRemaining: active.reduce((s, l) => s + l.remaining_capital, 0),
    totalMonthly: active.reduce((s, l) => s + l.monthly_payment, 0),
    truckCount: active.filter(l => l.asset_type === 'truck').length,
    trailerCount: active.filter(l => l.asset_type === 'trailer').length,
  };
}
