import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import type { VaultUploadInput } from '../lib/vaultTypes';
import {
  approveVaultDocument,
  deleteVaultDocument,
  fetchVaultBundle,
  getVaultDocumentSignedUrl,
  rejectVaultDocument,
  replaceVaultDocument,
  uploadVaultDocument,
} from '../services/vaultService';

export function useVault(
  userId?: string,
  role?: string | null,
  email?: string | null,
) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.vault.module(userId),
    queryFn: () => fetchVaultBundle(userId!, role, email),
    enabled: !!userId,
    staleTime: 20_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.vault.all });

  const upload = useMutation({
    mutationFn: (input: VaultUploadInput) => uploadVaultDocument(userId!, input),
    onSuccess: invalidate,
  });

  const replace = useMutation({
    mutationFn: ({ documentId, file }: { documentId: string; file: File }) =>
      replaceVaultDocument(userId!, documentId, file),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (documentId: string) => deleteVaultDocument(userId!, documentId),
    onSuccess: invalidate,
  });

  const approve = useMutation({
    mutationFn: (documentId: string) => approveVaultDocument(userId!, documentId, role, email),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: ({ documentId, reason }: { documentId: string; reason: string }) =>
      rejectVaultDocument(userId!, documentId, reason, role, email),
    onSuccess: invalidate,
  });

  const signedUrl = useMutation({
    mutationFn: ({
      document,
      action,
    }: {
      document: Parameters<typeof getVaultDocumentSignedUrl>[1];
      action?: 'preview' | 'download';
    }) => getVaultDocumentSignedUrl(userId!, document, action),
  });

  return { ...query, upload, replace, remove, approve, reject, signedUrl, invalidate };
}
