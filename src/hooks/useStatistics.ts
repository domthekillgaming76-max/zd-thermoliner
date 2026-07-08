import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { fetchStatisticsBundle } from '../services/statisticsService';

export function useStatistics() {
  return useQuery({
    queryKey: queryKeys.statistics.bundle(),
    queryFn: fetchStatisticsBundle,
    staleTime: 60_000,
  });
}
