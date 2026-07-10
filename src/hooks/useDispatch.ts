import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import {
  assignMission,
  cancelMission,
  createMission,
  deliverMission,
  fetchDispatchModuleBundle,
  fetchMissionById,
  fetchMissionAssignments,
  rescheduleMissionDate,
  reschedulePlanningEvent,
  startMission,
  updateMission,
  updateMissionStatus,
  type MissionFormInput,
} from '../services/dispatchService';
import type { MissionStatus } from '../lib/dispatchTypes';

export function useDispatchModule() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.dispatch.module(),
    queryFn: fetchDispatchModuleBundle,
    staleTime: 15_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('dispatch_module_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_missions' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.dispatch.all });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planning_events' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.dispatch.all });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatch_alerts' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.dispatch.all });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'telemetry_jobs' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.dispatch.all });
        qc.invalidateQueries({ queryKey: queryKeys.telemetryJobs.all });
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [qc]);

  return query;
}

export function useMissionDetail(missionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dispatch.detail(missionId ?? ''),
    queryFn: async () => {
      const mission = await fetchMissionById(missionId!);
      if (!mission) throw new Error('Mission introuvable.');
      const assignments = await fetchMissionAssignments(missionId!);
      return { mission, assignments };
    },
    enabled: !!missionId,
  });
}

export function useCreateMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, createdBy }: { input: MissionFormInput; createdBy?: string }) =>
      createMission(input, createdBy),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.dispatch.all }),
  });
}

export function useUpdateMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MissionFormInput }) => updateMission(id, input),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.dispatch.all });
      qc.invalidateQueries({ queryKey: queryKeys.dispatch.detail(id) });
    },
  });
}

export function useAssignMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ missionId, assignment, assignedBy }: {
      missionId: string;
      assignment: { driverId: string | null; truckId: string | null; trailerId: string | null; garageId: string | null; routeNotes?: string };
      assignedBy?: string;
    }) => assignMission(missionId, assignment, assignedBy),
    onSuccess: (_, { missionId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.dispatch.all });
      qc.invalidateQueries({ queryKey: queryKeys.dispatch.detail(missionId) });
      qc.invalidateQueries({ queryKey: queryKeys.drivers.all });
      qc.invalidateQueries({ queryKey: queryKeys.trucks.all });
    },
  });
}

export function useStartMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: startMission,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.dispatch.all }),
  });
}

export function useDeliverMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deliverMission,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dispatch.all });
      qc.invalidateQueries({ queryKey: queryKeys.roadSheets.all });
    },
  });
}

export function useCancelMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelMission,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.dispatch.all }),
  });
}

export function useUpdateMissionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: MissionStatus }) => updateMissionStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.dispatch.all }),
  });
}

export function useRescheduleMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ missionId, deliveryDate, loadingDate }: { missionId: string; deliveryDate: string; loadingDate?: string }) =>
      rescheduleMissionDate(missionId, deliveryDate, loadingDate),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.dispatch.all }),
  });
}

export function useReschedulePlanningEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, newStartAt, newEndAt }: { eventId: string; newStartAt: string; newEndAt?: string }) =>
      reschedulePlanningEvent(eventId, newStartAt, newEndAt),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.dispatch.all }),
  });
}
