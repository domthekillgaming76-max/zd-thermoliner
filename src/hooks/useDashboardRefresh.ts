import { useCallback, useState } from 'react';

export function useDashboardRefresh(refetch: () => Promise<unknown>, isFetching: boolean) {
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());

  const refresh = useCallback(async () => {
    await refetch();
    setLastUpdated(new Date());
  }, [refetch]);

  return {
    refresh,
    lastUpdated,
    isRefreshing: isFetching,
  };
}
