import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { fetchReportsBundle } from '../services/reportsService';

export function useReports() {
  return useQuery({
    queryKey: queryKeys.reports.module(),
    queryFn: fetchReportsBundle,
    staleTime: 30_000,
  });
}
