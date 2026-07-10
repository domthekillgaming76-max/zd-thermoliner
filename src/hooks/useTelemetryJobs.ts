import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import {
  correctTelemetryJobData,
  fetchActiveTelemetryJobs,
  fetchDriverTelemetryJobs,
  fetchPendingValidationJobs,
  fetchTelemetryJobUpdates,
  rejectTelemetryJob,
  validateTelemetryJob,
} from '../services/telemetryJobService';
import type { TelemetryJob } from '../lib/telemetryJobTypes';

export function useActiveTelemetryJobs() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.telemetryJobs.active(),
    queryFn: fetchActiveTelemetryJobs,
    staleTime: 5_000,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('telemetry_jobs_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'telemetry_jobs' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.telemetryJobs.all });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'telemetry_job_updates' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.telemetryJobs.all });
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [qc]);

  return query;
}

export function usePendingTelemetryValidations() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.telemetryJobs.pending(),
    queryFn: fetchPendingValidationJobs,
    staleTime: 10_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('telemetry_pending_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'telemetry_jobs' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.telemetryJobs.pending() });
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [qc]);

  return query;
}

export function useDriverTelemetryJobs(profileId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.telemetryJobs.driver(profileId ?? ''),
    queryFn: () => fetchDriverTelemetryJobs(profileId!),
    enabled: !!profileId,
    staleTime: 30_000,
  });
}

export function useTelemetryJobTimeline(jobId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.telemetryJobs.timeline(jobId ?? ''),
    queryFn: () => fetchTelemetryJobUpdates(jobId!),
    enabled: !!jobId,
    staleTime: 10_000,
  });
}

export function useValidateTelemetryJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, validatorId, comment }: { jobId: string; validatorId: string; comment?: string }) =>
      validateTelemetryJob(jobId, validatorId, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.telemetryJobs.all });
      qc.invalidateQueries({ queryKey: queryKeys.roadSheets.all });
      qc.invalidateQueries({ queryKey: queryKeys.drivers.all });
      qc.invalidateQueries({ queryKey: queryKeys.statistics.all });
    },
  });
}

export function useRejectTelemetryJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, validatorId, reason }: { jobId: string; validatorId: string; reason: string }) =>
      rejectTelemetryJob(jobId, validatorId, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.telemetryJobs.all }),
  });
}

export function useCorrectTelemetryJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, patch }: { jobId: string; patch: Parameters<typeof correctTelemetryJobData>[1] }) =>
      correctTelemetryJobData(jobId, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.telemetryJobs.all }),
  });
}

export type { TelemetryJob };
