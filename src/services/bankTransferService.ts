import { insertTransactionRow } from '../lib/transactionInsert';
import { fetchCompanyAccount } from './bankService';
import { supabase } from '../lib/supabase';

export type TransferKind =
  | 'internal'
  | 'driver'
  | 'supplier'
  | 'instant'
  | 'scheduled';

export interface TransferInput {
  kind: TransferKind;
  amount: number;
  beneficiary: string;
  reference: string;
  scheduledDate?: string;
  userId: string;
}

const TRANSFER_LABELS: Record<TransferKind, string> = {
  internal: 'Virement interne',
  driver: 'Paiement chauffeur',
  supplier: 'Paiement fournisseur',
  instant: 'Virement instantané',
  scheduled: 'Virement programmé',
};

export async function createTransfer(input: TransferInput): Promise<void> {
  const amount = Math.abs(input.amount);
  if (amount <= 0) throw new Error('Montant invalide.');

  const label = TRANSFER_LABELS[input.kind];
  const date = (input.scheduledDate ?? new Date().toISOString()).split('T')[0];
  const isScheduled = input.kind === 'scheduled' && input.scheduledDate;

  await insertTransactionRow({
    user_id: input.userId,
    type: input.kind === 'internal' ? 'transfer' : 'expense',
    amount,
    description: `${label} — ${input.beneficiary}${input.reference ? ` (${input.reference})` : ''}`,
    category: input.kind === 'driver' ? 'Salary' : input.kind === 'supplier' ? 'Other' : 'Other',
    date,
    created_by: input.userId,
    auto_generated: false,
    reference: input.reference || null,
  });

  if (!isScheduled) {
    const account = await fetchCompanyAccount();
    if (account) {
      await supabase
        .from('company_bank_account')
        .update({
          balance: Number(account.balance) - amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', account.id);
    }
  }
}
