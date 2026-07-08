import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys } from '../lib/queryKeys';
import { supabase } from '../lib/supabase';
import { fetchFleetMapVehicles, fetchLiveOpsMetrics } from '../services/liveOpsService';

export function useLiveOpsMetrics() {
  const query = useQuery({
    queryKey: queryKeys.liveOps.metrics(),
    queryFn: fetchLiveOpsMetrics,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('live_ops_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_missions' }, () => query.refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'freight_offers' }, () => query.refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'road_sheets' }, () => query.refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_presence' }, () => query.refetch())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [query.refetch]);

  return query;
}

export function useFleetMap(userId?: string, role?: string | null, email?: string | null) {
  const query = useQuery({
    queryKey: queryKeys.liveOps.fleetMap(userId),
    queryFn: () => fetchFleetMapVehicles(userId!, role, email),
    enabled: !!userId,
    staleTime: 10_000,
    refetchInterval: 20_000,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('fleet_map_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_tracking' }, () => query.refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_presence' }, () => query.refetch())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [userId, query.refetch]);

  return query;
}
