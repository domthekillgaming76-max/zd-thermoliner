import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys } from '../lib/queryKeys';
import { supabase } from '../lib/supabase';
import { PERF } from '../lib/perfConfig';
import { fetchFleetMapVehicles, fetchLiveOpsMetrics } from '../services/liveOpsService';

export function useLiveOpsMetrics() {
  const query = useQuery({
    queryKey: queryKeys.liveOps.metrics(),
    queryFn: fetchLiveOpsMetrics,
    staleTime: PERF.queryStaleTime,
    refetchInterval: PERF.liveOpsPollMs,
  });
  const { refetch } = query;

  useEffect(() => {
    const channel = supabase
      .channel('live_ops_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_missions' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'freight_offers' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'road_sheets' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_presence' }, () => refetch())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [refetch]);

  return query;
}

export function useFleetMap(userId?: string, role?: string | null, email?: string | null) {
  const query = useQuery({
    queryKey: queryKeys.liveOps.fleetMap(userId),
    queryFn: () => fetchFleetMapVehicles(userId!, role, email),
    enabled: !!userId,
    staleTime: PERF.queryStaleTime,
    refetchInterval: PERF.liveOpsPollMs,
  });
  const { refetch } = query;

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('fleet_map_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_tracking' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_presence' }, () => refetch())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [userId, refetch]);

  return query;
}
