import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import {
  assignTruckFleet,
  createFleetMaintenance,
  createFleetTruck,
  deleteFleetTruck,
  fetchFleetModuleBundle,
  fetchFleetTruckDetail,
  updateFleetTruck,
  uploadTruckDocument,
  validateFleetMaintenance,
  type TruckFormInput,
} from '../services/fleetService';
import type { MaintenanceType, TruckDocType } from '../lib/fleetTypes';

export function useFleetModule() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.trucks.module(),
    queryFn: fetchFleetModuleBundle,
    staleTime: 15_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('fleet_module_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trucks' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.trucks.all });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fleet_maintenance' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.trucks.all });
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [qc]);

  return query;
}

export function useFleetTruckDetail(truckId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.trucks.detail(truckId ?? ''),
    queryFn: () => fetchFleetTruckDetail(truckId!),
    enabled: !!truckId,
    staleTime: 10_000,
  });
}

export function useCreateFleetTruck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createFleetTruck,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.trucks.all }),
  });
}

export function useUpdateFleetTruck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TruckFormInput }) => updateFleetTruck(id, input),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.trucks.all });
      qc.invalidateQueries({ queryKey: queryKeys.trucks.detail(id) });
    },
  });
}

export function useDeleteFleetTruck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteFleetTruck,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.trucks.all }),
  });
}

export function useAssignTruckFleet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ truckId, driverId, trailerId, garageId }: {
      truckId: string; driverId: string | null; trailerId: string | null; garageId: string | null;
    }) => assignTruckFleet(truckId, driverId, trailerId, garageId),
    onSuccess: (_, { truckId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.trucks.all });
      qc.invalidateQueries({ queryKey: queryKeys.trucks.detail(truckId) });
      qc.invalidateQueries({ queryKey: queryKeys.drivers.all });
    },
  });
}

export function useCreateFleetMaintenance(truckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { maintenance_type: MaintenanceType; title: string; description?: string; scheduled_date?: string; estimated_cost?: number }) =>
      createFleetMaintenance({ truck_id: truckId, ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trucks.all });
      qc.invalidateQueries({ queryKey: queryKeys.trucks.detail(truckId) });
    },
  });
}

export function useValidateFleetMaintenance(truckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approverId, actualCost }: { id: string; approverId: string; actualCost?: number }) =>
      validateFleetMaintenance(id, approverId, actualCost),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trucks.all });
      qc.invalidateQueries({ queryKey: queryKeys.trucks.detail(truckId) });
    },
  });
}

export function useUploadTruckDocument(truckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, docType, expiresAt }: { file: File; docType: TruckDocType; expiresAt?: string }) =>
      uploadTruckDocument(truckId, file, docType, expiresAt),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.trucks.detail(truckId) }),
  });
}
