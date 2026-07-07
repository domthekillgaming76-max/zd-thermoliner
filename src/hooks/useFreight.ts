import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import type { AcceptFreightChainInput, AcceptFreightInput, FreightChainInput, FreightOfferInput } from '../lib/freightTypes';
import {
  acceptFreightChain,
  acceptFreightOffer,
  cancelFreightChain,
  cancelFreightOffer,
  completeChainLeg,
  createFreightChain,
  createFreightOffer,
  deleteFreightOffer,
  duplicateFreightOffer,
  fetchFreightBundle,
  requestFreightAssignment,
  updateFreightOffer,
} from '../services/freightService';

export function useFreight(
  userId?: string,
  role?: string | null,
  email?: string | null,
) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.freight.module(userId),
    queryFn: () => fetchFreightBundle(userId!, role, email),
    enabled: !!userId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.freight.all });

  const create = useMutation({
    mutationFn: (input: FreightOfferInput) => createFreightOffer(userId!, input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<FreightOfferInput> }) =>
      updateFreightOffer(id, input),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFreightOffer(id),
    onSuccess: invalidate,
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => duplicateFreightOffer(id, userId!),
    onSuccess: invalidate,
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelFreightOffer(id),
    onSuccess: invalidate,
  });

  const accept = useMutation({
    mutationFn: (input: AcceptFreightInput) =>
      acceptFreightOffer(userId!, input, role, email),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['dispatch'] });
    },
  });

  const request = useMutation({
    mutationFn: (input: { offerId: string; driverId: string; message?: string }) =>
      requestFreightAssignment(userId!, input.offerId, input.driverId, input.message),
    onSuccess: invalidate,
  });

  const createChain = useMutation({
    mutationFn: (input: FreightChainInput) => createFreightChain(userId!, input),
    onSuccess: invalidate,
  });

  const acceptChain = useMutation({
    mutationFn: (input: AcceptFreightChainInput) =>
      acceptFreightChain(userId!, input, role, email),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['dispatch'] });
    },
  });

  const completeLeg = useMutation({
    mutationFn: ({ chainId, legOrder }: { chainId: string; legOrder: number }) =>
      completeChainLeg(chainId, legOrder, role, email),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['dispatch'] });
    },
  });

  const cancelChain = useMutation({
    mutationFn: (chainId: string) => cancelFreightChain(chainId),
    onSuccess: invalidate,
  });

  return { ...query, create, update, remove, duplicate, cancel, accept, request, createChain, acceptChain, completeLeg, cancelChain, invalidate };
}
