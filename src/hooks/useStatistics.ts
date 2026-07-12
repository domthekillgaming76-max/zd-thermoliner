import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys } from '../lib/queryKeys';
import { supabase } from '../lib/supabase';
import { PERF } from '../lib/perfConfig';
import { fetchStatisticsBundle } from '../services/statisticsService';

export function useStatistics() {
  const query = useQuery({
    queryKey: queryKeys.statistics.bundle(),
    queryFn: fetchStatisticsBundle,
    staleTime: PERF.statisticsPollMs,
    refetchInterval: PERF.statisticsPollMs,
  });
  const { refetch } = query;

  useEffect(() => {
    const channel = supabase
      .channel('statistics_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'road_sheets' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => refetch())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [refetch]);

  return query;
}
