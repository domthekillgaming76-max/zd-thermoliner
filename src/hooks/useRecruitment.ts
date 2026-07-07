import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import type { RecruitmentFormInput } from '../lib/recruitmentTypes';
import {
  approveApplication,
  fetchAllApplications,
  fetchMyApplication,
  rejectApplication,
  submitApplication,
} from '../services/recruitmentService';

export function useMyApplication(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.recruitment.mine(userId ?? ''),
    queryFn: () => fetchMyApplication(userId!),
    enabled: !!userId,
  });
}

export function useAllApplications(enabled: boolean) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.recruitment.all,
    queryFn: fetchAllApplications,
    enabled,
  });

  return { ...query, invalidate: () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.all }) };
}

export function useSubmitApplication(userId: string | undefined, email: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecruitmentFormInput) =>
      submitApplication(userId!, email!, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.recruitment.mine(userId ?? '') });
      qc.invalidateQueries({ queryKey: queryKeys.recruitment.all });
    },
  });
}

export function useApproveApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      appId,
      role,
      notes,
    }: {
      appId: string;
      role?: 'chauffeur' | 'tractionnaire';
      notes?: string;
    }) => approveApplication(appId, role, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.all }),
  });
}

export function useRejectApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ appId, notes }: { appId: string; notes?: string }) =>
      rejectApplication(appId, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.all }),
  });
}
