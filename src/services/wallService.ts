import { supabase } from '../lib/supabase';
import type {
  CreateWallPostInput,
  WallComment,
  WallPost,
  WallReaction,
  WallReactionType,
} from '../lib/wallTypes';

function isWallSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return error.code === '42P01' || error.code === 'PGRST205' || msg.includes('does not exist');
}

type RawPost = WallPost & {
  profiles: WallPost['author'];
  wall_comments: (WallComment & { profiles: WallComment['author'] })[];
  wall_reactions: WallReaction[];
  wall_polls: {
    id: string;
    post_id: string;
    question: string;
    ends_at: string | null;
    wall_poll_options: { id: string; poll_id: string; label: string; sort_order: number }[];
  } | null;
  wall_events: {
    id: string;
    post_id: string;
    event_at: string;
    location: string | null;
    route_label: string | null;
    community_event_id: string | null;
  } | null;
};

const POST_SELECT = `
  *,
  profiles:author_id(id, full_name, pseudo, avatar_url, role),
  wall_comments(id, post_id, author_id, content, is_hidden, created_at,
    profiles:author_id(id, full_name, pseudo, avatar_url, role)
  ),
  wall_reactions(id, post_id, comment_id, user_id, reaction_type, created_at),
  wall_polls(id, post_id, question, ends_at, wall_poll_options(id, poll_id, label, sort_order)),
  wall_events(id, post_id, event_at, location, route_label, community_event_id)
`;

function mapPost(
  raw: RawPost,
  userId: string | undefined,
  voteMap: Map<string, string>,
  voteCounts: Map<string, number>,
  sharedIds: Set<string>,
): WallPost {
  const reactions = raw.wall_reactions ?? [];
  const userReaction = reactions.find(r => r.user_id === userId && r.post_id)?.reaction_type ?? null;
  const comments = (raw.wall_comments ?? [])
    .filter(c => !c.is_hidden || c.author_id === userId)
    .map(c => ({
      ...c,
      author: c.profiles,
    }));

  let poll = null;
  if (raw.wall_polls) {
    const pollId = raw.wall_polls.id;
    const options = (raw.wall_polls.wall_poll_options ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(o => ({
        ...o,
        vote_count: voteCounts.get(o.id) ?? 0,
      }));
    const totalVotes = options.reduce((s, o) => s + (o.vote_count ?? 0), 0);
    poll = {
      id: pollId,
      post_id: raw.wall_polls.post_id,
      question: raw.wall_polls.question,
      ends_at: raw.wall_polls.ends_at,
      options,
      user_vote_option_id: voteMap.get(pollId) ?? null,
      total_votes: totalVotes,
    };
  }

  return {
    id: raw.id,
    author_id: raw.author_id,
    post_type: raw.post_type,
    content: raw.content,
    media_url: raw.media_url,
    visibility: raw.visibility,
    is_pinned: raw.is_pinned,
    is_official: raw.is_official,
    share_count: raw.share_count,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    author: raw.profiles,
    reactions,
    comments,
    poll,
    event: raw.wall_events,
    user_reaction: userReaction,
    user_shared: sharedIds.has(raw.id),
  };
}

export async function fetchWallFeed(userId?: string): Promise<{
  posts: WallPost[];
  migrationRequired: boolean;
}> {
  const { error: probe } = await supabase.from('wall_posts').select('id').limit(1);
  const migrationRequired = !!probe && isWallSchemaError(probe);
  if (migrationRequired) return { posts: [], migrationRequired: true };

  const { data, error } = await supabase
    .from('wall_posts')
    .select(POST_SELECT)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) {
    if (isWallSchemaError(error)) return { posts: [], migrationRequired: true };
    throw error;
  }

  const rawPosts = (data ?? []) as unknown as RawPost[];
  const pollIds = rawPosts.map(p => p.wall_polls?.id).filter(Boolean) as string[];
  const postIds = rawPosts.map(p => p.id);

  const voteMap = new Map<string, string>();
  const voteCounts = new Map<string, number>();
  const sharedIds = new Set<string>();

  if (pollIds.length > 0) {
    const { data: votes } = await supabase
      .from('wall_poll_votes')
      .select('poll_id, option_id, user_id')
      .in('poll_id', pollIds);
    for (const v of votes ?? []) {
      voteCounts.set(v.option_id, (voteCounts.get(v.option_id) ?? 0) + 1);
      if (v.user_id === userId) voteMap.set(v.poll_id, v.option_id);
    }
  }

  if (userId && postIds.length > 0) {
    const { data: shares } = await supabase
      .from('wall_shares')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', postIds);
    for (const s of shares ?? []) sharedIds.add(s.post_id);
  }

  const posts = rawPosts.map(p => mapPost(p, userId, voteMap, voteCounts, sharedIds));
  return { posts, migrationRequired: false };
}

export async function createWallPost(
  input: CreateWallPostInput,
  authorId: string,
): Promise<WallPost> {
  const { data: post, error } = await supabase
    .from('wall_posts')
    .insert({
      author_id: authorId,
      post_type: input.post_type,
      content: input.content.trim(),
      media_url: input.media_url?.trim() || null,
      visibility: input.visibility,
      is_official: input.is_official ?? false,
    })
    .select('id')
    .single();

  if (error) throw error;

  if (input.post_type === 'poll' && input.poll_options?.length) {
    const { data: poll, error: pollErr } = await supabase
      .from('wall_polls')
      .insert({
        post_id: post.id,
        question: input.content.trim(),
        ends_at: input.poll_ends_at ?? null,
      })
      .select('id')
      .single();
    if (pollErr) throw pollErr;

    const options = input.poll_options
      .filter(o => o.trim())
      .map((label, i) => ({ poll_id: poll.id, label: label.trim(), sort_order: i }));
    if (options.length) {
      const { error: optErr } = await supabase.from('wall_poll_options').insert(options);
      if (optErr) throw optErr;
    }
  }

  if (input.post_type === 'event' && input.event_at) {
    const { error: evErr } = await supabase.from('wall_events').insert({
      post_id: post.id,
      event_at: input.event_at,
      location: input.event_location ?? null,
      route_label: input.event_route ?? null,
    });
    if (evErr) throw evErr;
  }

  const { posts } = await fetchWallFeed(authorId);
  const created = posts.find(p => p.id === post.id);
  if (!created) throw new Error('Publication créée mais introuvable');
  return created;
}

export async function deleteWallPost(postId: string): Promise<void> {
  const { error } = await supabase.from('wall_posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function togglePinPost(postId: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from('wall_posts').update({ is_pinned: pinned }).eq('id', postId);
  if (error) throw error;
}

export async function addWallComment(postId: string, authorId: string, content: string): Promise<void> {
  const { error } = await supabase.from('wall_comments').insert({
    post_id: postId,
    author_id: authorId,
    content: content.trim(),
  });
  if (error) throw error;
}

export async function hideWallComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('wall_comments').update({ is_hidden: true }).eq('id', commentId);
  if (error) throw error;
}

export async function deleteWallComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('wall_comments').delete().eq('id', commentId);
  if (error) throw error;
}

export async function setWallReaction(
  postId: string,
  userId: string,
  reactionType: WallReactionType | null,
): Promise<void> {
  const { data: existing } = await supabase
    .from('wall_reactions')
    .select('id, reaction_type')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .is('comment_id', null)
    .maybeSingle();

  if (!reactionType) {
    if (existing) {
      const { error } = await supabase.from('wall_reactions').delete().eq('id', existing.id);
      if (error) throw error;
    }
    return;
  }

  if (existing) {
    const { error } = await supabase
      .from('wall_reactions')
      .update({ reaction_type: reactionType })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('wall_reactions').insert({
      post_id: postId,
      user_id: userId,
      reaction_type: reactionType,
    });
    if (error) throw error;
  }
}

export async function votePoll(pollId: string, optionId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('wall_poll_votes').upsert(
    { poll_id: pollId, option_id: optionId, user_id: userId },
    { onConflict: 'poll_id,user_id' },
  );
  if (error) throw error;
}

export async function shareWallPost(postId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('wall_shares').insert({ post_id: postId, user_id: userId });
  if (error && error.code !== '23505') throw error;
}
