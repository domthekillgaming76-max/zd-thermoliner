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
  const isScheduled = input.kind === 'scheduled' && Boolean(input.scheduledDate);
  const { error } = await supabase.rpc('post_company_transaction', {
    p_type: input.kind === 'internal' ? 'transfer' : 'expense',
    p_amount: amount,
    p_description: `${label} — ${input.beneficiary}${input.reference ? ` (${input.reference})` : ''}`,
    p_category: input.kind === 'driver' ? 'Salary' : 'Other',
    p_date: date,
    p_reference: input.reference || null,
    p_user_id: input.userId,
    p_auto_generated: false,
    p_source: isScheduled ? 'scheduled_transfer' : 'transfer',
    p_metadata: {
      kind: input.kind,
      beneficiary: input.beneficiary,
      scheduled: isScheduled,
    },
  });
  if (error) throw error;
}
