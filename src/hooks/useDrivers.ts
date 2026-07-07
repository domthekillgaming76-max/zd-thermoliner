import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import {
  approveDriverDocument,
  assignGarageToDriver,
  assignTrailerToDriver,
  assignTruckToDriver,
  createDriver,
  createDriverIncident,
  createSalaryRecord,
  deleteDriver,
  fetchDriverDetailBundle,
  fetchDriverModuleBundle,
  promoteDriverMemberRole,
  suspendDriver,
  updateDriver,
  uploadDriverDocument,
  type DriverFormInput,
} from '../services/driverService';
import type { DriverDocType, IncidentType } from '../lib/driverTypes';

export function useDriversModule() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.drivers.module(),
    queryFn: fetchDriverModuleBundle,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('drivers_module_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.drivers.all });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'road_sheets' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.drivers.all });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_documents' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.drivers.all });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trucks' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.drivers.all });
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [qc]);

  return query;
}

export function useDriverDetail(driverId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.drivers.detail(driverId ?? ''),
    queryFn: () => fetchDriverDetailBundle(driverId!),
    enabled: !!driverId,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!driverId) return;
    const channel = supabase
      .channel(`driver_detail_${driverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'road_sheets' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.drivers.detail(driverId) });
        qc.invalidateQueries({ queryKey: queryKeys.drivers.module() });
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [driverId, qc]);

  return query;
}

export function useCreateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDriver,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.drivers.all }),
  });
}

export function useUpdateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DriverFormInput }) => updateDriver(id, input),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.drivers.all });
      qc.invalidateQueries({ queryKey: queryKeys.drivers.detail(id) });
    },
  });
}

export function useDeleteDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteDriver,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.drivers.all }),
  });
}

export function useAssignTruck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ driverId, truckId }: { driverId: string; truckId: string | null }) =>
      assignTruckToDriver(driverId, truckId),
    onSuccess: (_, { driverId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.drivers.all });
      qc.invalidateQueries({ queryKey: queryKeys.drivers.detail(driverId) });
    },
  });
}

export function useAssignTrailer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ driverId, trailerId }: { driverId: string; trailerId: string | null }) =>
      assignTrailerToDriver(driverId, trailerId),
    onSuccess: (_, { driverId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.drivers.all });
      qc.invalidateQueries({ queryKey: queryKeys.drivers.detail(driverId) });
    },
  });
}

export function useAssignGarage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ driverId, garageId }: { driverId: string; garageId: string | null }) =>
      assignGarageToDriver(driverId, garageId),
    onSuccess: (_, { driverId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.drivers.all });
      qc.invalidateQueries({ queryKey: queryKeys.drivers.detail(driverId) });
    },
  });
}

export function useCreateIncident(driverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { incident_type: IncidentType; title: string; description?: string }) =>
      createDriverIncident({ driver_id: driverId, ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.drivers.detail(driverId) });
    },
  });
}

export function useCreateSalaryRecord(driverId: string) {
  const qc = useQueryClient();
  const now = new Date();
  return useMutation({
    mutationFn: (input: { bonus?: number; penalty?: number; notes?: string }) =>
      createSalaryRecord({
        driver_id: driverId,
        period_month: now.getMonth() + 1,
        period_year: now.getFullYear(),
        bonus: input.bonus,
        penalty: input.penalty,
        notes: input.notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.drivers.detail(driverId) });
    },
  });
}

export function useUploadDriverDocument(driverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      docType,
      expiresAt,
    }: {
      file: File;
      docType: DriverDocType;
      expiresAt?: string;
    }) => uploadDriverDocument(driverId, file, docType, expiresAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.drivers.detail(driverId) });
      qc.invalidateQueries({ queryKey: queryKeys.drivers.module() });
    },
  });
}

export function useApproveDriverDocument(driverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, approverId }: { documentId: string; approverId: string }) =>
      approveDriverDocument(documentId, approverId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.drivers.detail(driverId) });
      qc.invalidateQueries({ queryKey: queryKeys.drivers.module() });
    },
  });
}

export function useSuspendDriver(driverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (suspended: boolean) => suspendDriver(driverId, suspended),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.drivers.all });
      qc.invalidateQueries({ queryKey: queryKeys.drivers.detail(driverId) });
    },
  });
}

export function usePromoteDriver(driverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => promoteDriverMemberRole(driverId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.drivers.all });
      qc.invalidateQueries({ queryKey: queryKeys.drivers.detail(driverId) });
    },
  });
}
