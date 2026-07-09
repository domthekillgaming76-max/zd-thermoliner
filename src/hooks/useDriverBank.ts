import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { DRIVER_BANK_POLL_MS } from '../lib/driverBankTypes';
import { fetchDriverBankBundle } from '../services/driverBankService';

export function useDriverBank(profileId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.driverBank.bundle(profileId ?? ''),
    enabled: Boolean(profileId),
    staleTime: 3_000,
    refetchInterval: DRIVER_BANK_POLL_MS,
    queryFn: () => fetchDriverBankBundle(profileId!),
  });

  useEffect(() => {
    if (!profileId) return;

    const channel = supabase
      .channel(`driver-bank-${profileId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_bank_accounts', filter: `profile_id=eq.${profileId}` },
        () => { void queryClient.invalidateQueries({ queryKey: queryKeys.driverBank.bundle(profileId) }); },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'driver_bank_transactions', filter: `profile_id=eq.${profileId}` },
        () => { void queryClient.invalidateQueries({ queryKey: queryKeys.driverBank.bundle(profileId) }); },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [profileId, queryClient]);

  return query;
}
