import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { fetchTruckShop, purchaseTruckEquipment } from '../services/truckShopService';

export function useTruckShop(profileId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.truckShop.store(profileId ?? ''), enabled: Boolean(profileId),
    queryFn: () => fetchTruckShop(profileId!), staleTime: 10_000,
  });
  const purchase = useMutation({
    mutationFn: purchaseTruckEquipment,
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.truckShop.all }),
        qc.invalidateQueries({ queryKey: queryKeys.driverBank.all }),
      ]);
    },
  });
  return { ...query, purchase };
}
