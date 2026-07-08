import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { fetchDriverByUserId } from '../services/roadSheetService';
import { ensureDriverHrDossier, fetchDriverHrDossier } from '../services/driverHrService';
import { EMPTY_DRIVER_HR_DOSSIER } from '../lib/driverHrTypes';

export function useDriverHrFolder(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.drivers.hrFolder(userId ?? ''),
    enabled: Boolean(userId),
    staleTime: 15_000,
    queryFn: async () => {
      const driver = await fetchDriverByUserId(userId!);
      if (!driver) return null;

      try {
        await ensureDriverHrDossier(driver);
      } catch (err) {
        console.warn('[Z&D HR] ensure dossier on profile:', err);
      }

      let dossier = { ...EMPTY_DRIVER_HR_DOSSIER };
      try {
        dossier = await fetchDriverHrDossier(driver.id, driver.user_id ?? userId ?? null);
      } catch (err) {
        console.warn('[Z&D HR] fetch dossier on profile:', err);
      }

      return { driver, dossier };
    },
  });
}
