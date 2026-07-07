import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import type { TrackingStatus } from '../lib/trackingTypes';
import {
  acknowledgeTrackingAlert,
  fetchTrackingBundle,
  simulateProgress,
  updateDeliveryStatus,
  updateGpsPosition,
} from '../services/trackingService';

export function useTracking(
  userId?: string,
  role?: string | null,
  email?: string | null,
) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.tracking.module(userId),
    queryFn: () => fetchTrackingBundle(userId!, role, email),
    enabled: !!userId,
    staleTime: 10_000,
    refetchInterval: 20_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.tracking.all });

  const setStatus = useMutation({
    mutationFn: ({ trackingId, status }: { trackingId: string; status: TrackingStatus }) =>
      updateDeliveryStatus(userId!, trackingId, status, role, email),
    onSuccess: invalidate,
  });

  const setPosition = useMutation({
    mutationFn: ({ trackingId, lat, lng }: { trackingId: string; lat: number; lng: number }) =>
      updateGpsPosition(userId!, trackingId, lat, lng, role, email),
    onSuccess: invalidate,
  });

  const setProgress = useMutation({
    mutationFn: ({ trackingId, progress }: { trackingId: string; progress: number }) =>
      simulateProgress(userId!, trackingId, progress, role, email),
    onSuccess: invalidate,
  });

  const ackAlert = useMutation({
    mutationFn: (alertId: string) => acknowledgeTrackingAlert(alertId),
    onSuccess: invalidate,
  });

  return { ...query, setStatus, setPosition, setProgress, ackAlert, invalidate };
}
