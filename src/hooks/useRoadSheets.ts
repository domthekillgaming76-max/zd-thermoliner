import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useEffect } from 'react';

import { syncSalaryFromValidatedRoadSheet } from '../services/driverService';
import { autoInvoiceFromValidatedRoadSheet } from '../services/invoicingService';
import { queryKeys } from '../lib/queryKeys';
import { supabase } from '../lib/supabase';

import {

  createRoadSheet,

  deleteRoadSheet,

  fetchDrivers,

  fetchRoadSheets,

  fetchTrucks,

  rejectRoadSheet,

  updateRoadSheet,

  uploadDeliveryPhoto,

  validateRoadSheet,

  type RoadSheetFormData,

} from '../services/roadSheetService';

import { syncRoadSheetToBank } from '../services/bankSyncService';

import type { RoadSheet } from '../lib/supabase';



export function useRoadSheetsQuery(enabled = true) {

  const query = useQuery({

    queryKey: queryKeys.roadSheets.list(),

    queryFn: fetchRoadSheets,

    staleTime: 15_000,

    enabled,

  });



  const qc = useQueryClient();



  useEffect(() => {

    if (!enabled) return;



    const channel = supabase

      .channel('roadsheets_rt')

      .on('postgres_changes', { event: '*', schema: 'public', table: 'road_sheets' }, () => {

        qc.invalidateQueries({ queryKey: queryKeys.roadSheets.all });

      })

      .subscribe();



    return () => {

      channel.unsubscribe();

    };

  }, [qc, enabled]);



  return query;

}



export function useFleetOptions() {

  const driversQuery = useQuery({

    queryKey: queryKeys.drivers.list(),

    queryFn: fetchDrivers,

    staleTime: 60_000,

  });



  const trucksQuery = useQuery({

    queryKey: queryKeys.trucks.list(),

    queryFn: fetchTrucks,

    staleTime: 60_000,

  });



  return {

    drivers: driversQuery.data ?? [],

    trucks: trucksQuery.data ?? [],

    loading: driversQuery.isLoading || trucksQuery.isLoading,

  };

}



export function useCreateRoadSheet(userId: string | undefined) {

  const qc = useQueryClient();



  return useMutation({

    mutationFn: async ({

      form,

      driverName,

      driverUserId,

      photoFile,

    }: {

      form: RoadSheetFormData;

      driverName: string;

      driverUserId: string | null;

      photoFile: File | null;

    }) => {

      if (!userId) throw new Error('Vous devez être connecté pour enregistrer une feuille de route.');

      const photoUrl = photoFile ? await uploadDeliveryPhoto(photoFile) : null;

      return createRoadSheet({ ...form, delivery_photo_url: photoUrl }, driverName, driverUserId);

    },

    onSuccess: async () => {

      await qc.invalidateQueries({ queryKey: queryKeys.roadSheets.all });

      await qc.refetchQueries({ queryKey: queryKeys.roadSheets.list() });

    },

  });

}



export function useUpdateRoadSheet(userId: string | undefined) {

  const qc = useQueryClient();



  return useMutation({

    mutationFn: async ({

      sheetId,

      form,

      driverName,

      driverUserId,

      photoFile,

    }: {

      sheetId: string;

      form: RoadSheetFormData;

      driverName: string;

      driverUserId: string | null;

      photoFile: File | null;

    }) => {

      if (!userId) throw new Error('Vous devez être connecté.');

      const photoUrl = photoFile ? await uploadDeliveryPhoto(photoFile) : null;

      return updateRoadSheet(

        sheetId,

        { ...form, delivery_photo_url: photoUrl ?? form.delivery_photo_url },

        driverName,

        driverUserId,

      );

    },

    onSuccess: async () => {

      await qc.invalidateQueries({ queryKey: queryKeys.roadSheets.all });

    },

  });

}



export interface ValidateRoadSheetResult {
  sheetId: string;
  bankSyncFailed: boolean;
  bankSyncError?: string;
}

export function useValidateRoadSheet(userId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (sheet: RoadSheet): Promise<ValidateRoadSheetResult> => {
      const { sheetId } = await validateRoadSheet(sheet);

      try {
        await syncRoadSheetToBank(sheetId);
      } catch (bankError) {
        const message =
          bankError instanceof Error ? bankError.message : 'Synchronisation bancaire échouée.';
        console.error('[Z&D] bank sync error after validation:', bankError);
        return { sheetId, bankSyncFailed: true, bankSyncError: message };
      }

      try {
        await syncSalaryFromValidatedRoadSheet(sheet);
      } catch (salaryError) {
        console.warn('[Z&D] driver salary sync after validation:', salaryError);
      }

      try {
        await autoInvoiceFromValidatedRoadSheet(sheetId, userId);
      } catch (invoiceError) {
        console.warn('[Z&D] auto invoice after validation:', invoiceError);
      }

      return { sheetId, bankSyncFailed: false };
    },

    onSuccess: () => {
      qc.invalidateQueries();
    },

    onError: (error: Error) => {
      console.error('[Z&D] validateRoadSheet validation error:', error.message);
    },
  });
}



export function useRejectRoadSheet(userId: string | undefined) {

  const qc = useQueryClient();



  return useMutation({

    mutationFn: ({ sheetId, reason }: { sheetId: string; reason: string }) =>

      rejectRoadSheet(sheetId, reason),

    onSuccess: () => {

      qc.invalidateQueries({ queryKey: queryKeys.roadSheets.all });

      qc.invalidateQueries({ queryKey: queryKeys.dashboard(userId) });

    },

    onError: (error: Error) => {

      console.error('[Z&D] rejectRoadSheet:', error.message);

    },

  });

}



export function useDeleteRoadSheet() {

  const qc = useQueryClient();



  return useMutation({

    mutationFn: deleteRoadSheet,

    onSuccess: () => {

      qc.invalidateQueries({ queryKey: queryKeys.roadSheets.all });

    },

    onError: (error: Error) => {

      console.error('[Z&D] deleteRoadSheet:', error.message);

    },

  });

}

