import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import type { CreateProfilePostInput } from '../lib/profilePostTypes';
import {
  createProfilePost,
  deleteProfilePost,
  fetchProfilePosts,
} from '../services/profilePostService';

export function useProfilePosts(userId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.profile.posts(userId),
    queryFn: () => fetchProfilePosts(userId!),
    enabled: Boolean(userId),
  });

  const create = useMutation({
    mutationFn: (input: CreateProfilePostInput) => createProfilePost(userId!, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.profile.posts(userId) });
    },
  });

  const remove = useMutation({
    mutationFn: deleteProfilePost,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.profile.posts(userId) });
    },
  });

  return { ...query, create, remove };
}
