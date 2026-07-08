export type HrDocType = 'contract' | 'company_card' | 'payslip';
export type HrDocStatus = 'active' | 'pending' | 'valid' | 'expired' | 'rejected' | 'suspended';
export type CompanyCardStatus = 'active' | 'suspended' | 'expired';

export interface DriverHrContractMetadata {
  driver_name: string;
  pseudo: string | null;
  email: string | null;
  entry_date: string;
  role: string;
  company: string;
  contract_type: string;
  status: string;
  admin_signature: string;
  driver_signature: string | null;
  signed_at: string | null;
}

export interface DriverHrDocument {
  id: string;
  driver_id: string;
  profile_id: string | null;
  doc_type: HrDocType;
  title: string;
  status: HrDocStatus;
  metadata: DriverHrContractMetadata | Record<string, unknown>;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyCard {
  id: string;
  driver_id: string;
  profile_id: string | null;
  bank_name: string;
  holder_name: string;
  masked_number: string;
  status: CompanyCardStatus;
  spending_limit: number;
  issued_at: string;
  created_at: string;
  updated_at: string;
}

export interface DriverPayslip {
  id: string;
  driver_id: string;
  profile_id: string | null;
  month: number;
  year: number;
  km_total: number;
  deliveries_total: number;
  bonus_amount: number;
  gross_amount: number;
  deductions_amount: number;
  net_amount: number;
  bank_transaction_id: string | null;
  salary_history_id: string | null;
  generated_at: string;
  created_at: string;
  payment_date?: string | null;
  transaction_reference?: string | null;
}

export interface DriverHrDossier {
  contract: DriverHrDocument | null;
  companyCard: CompanyCard | null;
  payslips: DriverPayslip[];
  paymentHistory: {
    id: string;
    month: number;
    year: number;
    net_amount: number;
    payment_date: string | null;
    transaction_reference: string | null;
  }[];
  hrNotifications: {
    id: string;
    title: string;
    message: string | null;
    read: boolean;
    created_at: string;
  }[];
}

export const HR_COMPANY_NAME = 'Z&D Thermoliner';
export const HR_CONTRACT_TYPE = 'Contrat RP / VTC ETS2-ATS';
export const HR_DEFAULT_CARD_LIMIT = 5000;
