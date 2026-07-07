import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import type { RoadSheetFormData } from '../services/roadSheetService';
import {
  contactAdmin,
  deliverMission,
  fetchDriverPortalBundle,
  logDriverStatus,
  reportTruckIssue,
  startMission,
  submitMobileRoadSheet,
  uploadDeliveryProof,
} from '../services/driverPortalService';

export function useDriverPortal(
  userId?: string,
  role?: string | null,
  email?: string | null,
) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.driverPortal.module(userId),
    queryFn: () => fetchDriverPortalBundle(userId!, role, email),
    enabled: !!userId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.driverPortal.all });

  const startMissionMutation = useMutation({
    mutationFn: async (missionId: string) => {
      await startMission(missionId);
      const driverId = query.data?.home.driverId;
      if (driverId && userId) {
        await logDriverStatus(driverId, userId, 'on_mission', 'Mission démarrée', missionId);
      }
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: queryKeys.dispatch.all });
    },
  });

  const finishMissionMutation = useMutation({
    mutationFn: async (missionId: string) => {
      await deliverMission(missionId);
      const driverId = query.data?.home.driverId;
      if (driverId && userId) {
        await logDriverStatus(driverId, userId, 'available', 'Mission livrée', missionId);
      }
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: queryKeys.dispatch.all });
    },
  });

  const submitSheet = useMutation({
    mutationFn: (form: RoadSheetFormData) => submitMobileRoadSheet(userId!, form),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: queryKeys.roadSheets.all });
    },
  });

  const uploadProof = useMutation({
    mutationFn: (input: { file: File; missionId?: string; notes?: string }) => {
      const driverId = query.data?.home.driverId;
      if (!driverId) throw new Error('Profil chauffeur introuvable.');
      return uploadDeliveryProof(userId!, driverId, input.file, input.missionId, undefined, input.notes);
    },
    onSuccess: invalidate,
  });

  const reportIssue = useMutation({
    mutationFn: (input: { title: string; description: string }) => {
      const driverId = query.data?.home.driverId;
      if (!driverId) throw new Error('Profil chauffeur introuvable.');
      return reportTruckIssue(driverId, userId!, input.title, input.description);
    },
    onSuccess: invalidate,
  });

  const messageAdmin = useMutation({
    mutationFn: (message: string) =>
      contactAdmin(userId!, query.data?.home.driverName ?? 'Chauffeur', message),
    onSuccess: invalidate,
  });

  return {
    ...query,
    startMission: startMissionMutation,
    finishMission: finishMissionMutation,
    submitSheet,
    uploadProof,
    reportIssue,
    messageAdmin,
    invalidate,
  };
}
