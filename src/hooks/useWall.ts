import { useEffect, useRef, useState, useCallback } from 'react';
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

import { PERF } from '../lib/perfConfig';

const REFETCH_MS = PERF.wallPollMs;

export function useWall(userId?: string) {
  const qc = useQueryClient();
  const [isLive, setIsLive] = useState(false);
  const [newPostReceived, setNewPostReceived] = useState(false);
  const topPostIdRef = useRef<string | null>(null);
  const ownMutationRef = useRef(false);

  const query = useQuery({
    queryKey: queryKeys.wall.module(userId),
    queryFn: () => fetchWallFeed(userId),
    staleTime: 5_000,
    refetchInterval: REFETCH_MS,
    refetchIntervalInBackground: PERF.wallPollInBackground,
  });

  const markSeen = useCallback(() => {
    const posts = query.data?.posts ?? [];
    if (posts[0]) topPostIdRef.current = posts[0].id;
    setNewPostReceived(false);
  }, [query.data?.posts]);

  useEffect(() => {
    const posts = query.data?.posts ?? [];
    if (!posts.length) return;

    const top = posts[0];
    if (ownMutationRef.current) {
      topPostIdRef.current = top.id;
      ownMutationRef.current = false;
      return;
    }

    if (topPostIdRef.current && top.id !== topPostIdRef.current && top.author_id !== userId) {
      setNewPostReceived(true);
    } else if (!topPostIdRef.current) {
      topPostIdRef.current = top.id;
    }
  }, [query.data?.posts, userId]);

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
      .subscribe(status => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.wall.all });

  const createPost = useMutation({
    mutationFn: (input: CreateWallPostInput) => {
      ownMutationRef.current = true;
      return createWallPost(input, userId!);
    },
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
    isLive,
    newPostReceived,
    markSeen,
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
