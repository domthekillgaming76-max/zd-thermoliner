import type { CompanyCard } from './driverHrTypes';
import type { DriverPayslip } from './driverHrTypes';

export type DriverBankAccountStatus = 'active' | 'frozen' | 'closed';
export type DriverBankTxType =
  | 'salary'
  | 'bonus'
  | 'refund'
  | 'advance'
  | 'sanction'
  | 'manual_transfer'
  | 'admin_correction'
  | 'other';
export type DriverBankTxDirection = 'credit' | 'debit';
export type CompanyTransferType = Exclude<DriverBankTxType, 'other'>;

export interface DriverBankAccount {
  id: string;
  profile_id: string;
  driver_id: string;
  account_number: string;
  rp_iban: string;
  bank_name: string;
  holder_name: string;
  holder_pseudo: string | null;
  holder_email: string | null;
  balance: number;
  status: DriverBankAccountStatus;
  opened_at: string;
  created_at: string;
  updated_at: string;
}

export interface DriverBankTransaction {
  id: string;
  account_id: string;
  profile_id: string;
  type: DriverBankTxType;
  direction: DriverBankTxDirection;
  amount: number;
  balance_after: number;
  label: string;
  reference: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface CompanyBankTransfer {
  id: string;
  company_account_id: string | null;
  target_profile_id: string;
  target_driver_account_id: string;
  type: CompanyTransferType;
  amount: number;
  reason: string;
  reference: string | null;
  admin_comment: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  company_transaction_id: string | null;
  driver_transaction_id: string | null;
  created_by: string | null;
  created_at: string;
  holder_name?: string;
}

export interface DriverBankBundle {
  account: DriverBankAccount | null;
  transactions: DriverBankTransaction[];
  payslips: DriverPayslip[];
  companyCard: CompanyCard | null;
  openingBalance: number;
  closingBalance: number;
}

export interface AdminDriverBankAccountRow extends DriverBankAccount {
  driver_name?: string;
}

export interface AdminTransferInput {
  targetProfileId: string;
  type: CompanyTransferType;
  amount: number;
  reason: string;
  reference?: string;
  adminComment?: string;
  salaryHistoryId?: string;
}

export interface AdminTransferResult {
  transfer_id: string;
  driver_transaction_id: string;
  company_transaction_id: string;
  reference: string;
  driver_balance: number;
  company_balance: number;
}

export const DRIVER_BANK_NAME = 'Crédit Agricole Z&D Thermoliner';
export const DRIVER_BANK_POLL_MS = 5_000;

export const TRANSFER_TYPE_LABELS: Record<CompanyTransferType, string> = {
  salary: 'Salaire',
  bonus: 'Prime',
  refund: 'Remboursement',
  advance: 'Avance',
  sanction: 'Retenue / sanction RP',
  manual_transfer: 'Virement manuel',
  admin_correction: 'Correction admin',
};
