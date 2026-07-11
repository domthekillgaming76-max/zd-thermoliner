import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import {
  fetchClovisRentalBundle,
  returnClovisRental,
  startClovisRental,
} from '../services/clovisRentalService';

export function useClovisRental(profileId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.clovisRental.bundle(profileId ?? ''),
    enabled: Boolean(profileId),
    staleTime: 5_000,
    refetchInterval: 30_000,
    queryFn: () => fetchClovisRentalBundle(profileId!),
  });

  useEffect(() => {
    if (!profileId) return;

    const channel = supabase
      .channel(`clovis-rental-${profileId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clovis_vehicle_rentals' }, () => {
        void qc.invalidateQueries({ queryKey: queryKeys.clovisRental.all });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clovis_rental_charges' }, () => {
        void qc.invalidateQueries({ queryKey: queryKeys.clovisRental.all });
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [profileId, qc]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.clovisRental.all });
    void qc.invalidateQueries({ queryKey: queryKeys.driverBank.all });
  };

  const startRental = useMutation({
    mutationFn: startClovisRental,
    onSuccess: invalidate,
  });

  const returnRental = useMutation({
    mutationFn: (rentalId?: string) => returnClovisRental(rentalId),
    onSuccess: invalidate,
  });

  return { ...query, startRental, returnRental };
}
