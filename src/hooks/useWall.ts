import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import type { CreateWallPostInput, WallReactionType } from '../lib/wallTypes';
import {
  addWallComment,
  createWallPost,
  deleteWallComment,
  deleteWallPost,
  fetchWallFeed,
  hideWallComment,
  setWallReaction,
  shareWallPost,
  togglePinPost,
  votePoll,
} from '../services/wallService';

export function useWall(userId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.wall.module(userId),
    queryFn: () => fetchWallFeed(userId),
    staleTime: 15_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('wall_module_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wall_posts' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.wall.all });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wall_comments' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.wall.all });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wall_reactions' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.wall.all });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wall_poll_votes' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.wall.all });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.wall.all });

  const createPost = useMutation({
    mutationFn: (input: CreateWallPostInput) => createWallPost(input, userId!),
    onSuccess: invalidate,
  });

  const removePost = useMutation({
    mutationFn: deleteWallPost,
    onSuccess: invalidate,
  });

  const pinPost = useMutation({
    mutationFn: ({ postId, pinned }: { postId: string; pinned: boolean }) => togglePinPost(postId, pinned),
    onSuccess: invalidate,
  });

  const comment = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      addWallComment(postId, userId!, content),
    onSuccess: invalidate,
  });

  const moderateComment = useMutation({
    mutationFn: hideWallComment,
    onSuccess: invalidate,
  });

  const removeComment = useMutation({
    mutationFn: deleteWallComment,
    onSuccess: invalidate,
  });

  const react = useMutation({
    mutationFn: ({ postId, type }: { postId: string; type: WallReactionType | null }) =>
      setWallReaction(postId, userId!, type),
    onSuccess: invalidate,
  });

  const vote = useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      votePoll(pollId, optionId, userId!),
    onSuccess: invalidate,
  });

  const share = useMutation({
    mutationFn: (postId: string) => shareWallPost(postId, userId!),
    onSuccess: invalidate,
  });

  return {
    ...query,
    createPost,
    removePost,
    pinPost,
    comment,
    moderateComment,
    removeComment,
    react,
    vote,
    share,
  };
}
