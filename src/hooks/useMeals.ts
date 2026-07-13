import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { fetchMealOrders, fetchMealStore, purchaseMeals } from '../services/mealService';

export function useMealStore(profileId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.meals.store(profileId ?? ''),
    enabled: Boolean(profileId),
    queryFn: () => fetchMealStore(profileId!),
    staleTime: 10_000,
  });
  const purchase = useMutation({
    mutationFn: purchaseMeals,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.meals.all });
      await qc.invalidateQueries({ queryKey: queryKeys.driverBank.all });
    },
  });
  return { ...query, purchase };
}

export function useMealOrders(profileId?: string) {
  return useQuery({
    queryKey: queryKeys.meals.orders(profileId ?? ''),
    enabled: Boolean(profileId),
    queryFn: () => fetchMealOrders(profileId!, 100),
    staleTime: 10_000,
  });
}
