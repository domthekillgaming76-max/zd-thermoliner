import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

/** Central invalidation after financial / operational mutations. */
export function invalidateErpFinancials(qc: QueryClient, userId?: string) {
  void qc.invalidateQueries({ queryKey: queryKeys.dashboard(userId) });
  void qc.invalidateQueries({ queryKey: queryKeys.roadSheets.all });
  void qc.invalidateQueries({ queryKey: queryKeys.drivers.all });
  void qc.invalidateQueries({ queryKey: queryKeys.trucks.all });
  void qc.invalidateQueries({ queryKey: queryKeys.bank.all });
  void qc.invalidateQueries({ queryKey: queryKeys.finance.all });
  void qc.invalidateQueries({ queryKey: queryKeys.freight.all });
  void qc.invalidateQueries({ queryKey: queryKeys.dispatch.all });
  void qc.invalidateQueries({ queryKey: queryKeys.liveOps.metrics() });
  void qc.invalidateQueries({ queryKey: ['statistics'] });
}
