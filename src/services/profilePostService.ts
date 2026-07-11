import { supabase } from '../lib/supabase';
import type { CreateProfilePostInput, ProfilePost } from '../lib/profilePostTypes';

const MEDIA_BUCKET = 'wall-media';

function isSchemaMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return error.code === '42P01' || error.code === 'PGRST205' || msg.includes('profile_posts');
}

export async function uploadProfilePostMedia(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `profile/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error || !data) throw new Error(error?.message ?? 'Échec du téléversement');
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(data.path).data.publicUrl;
}

export async function fetchProfilePosts(authorId: string): Promise<{
  posts: ProfilePost[];
  migrationRequired: boolean;
}> {
  const { data, error } = await supabase
    .from('profile_posts')
    .select('*')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (isSchemaMissing(error)) {
    return { posts: [], migrationRequired: true };
  }
  if (error) throw error;
  return { posts: (data ?? []) as ProfilePost[], migrationRequired: false };
}

export async function createProfilePost(
  authorId: string,
  input: CreateProfilePostInput,
): Promise<ProfilePost> {
  let mediaUrl = input.media_url?.trim() || null;
  let mediaType = input.media_type ?? 'text';

  if (input.media_file) {
    mediaUrl = await uploadProfilePostMedia(input.media_file, authorId);
    mediaType = input.media_file.type.startsWith('video/') ? 'video' : 'photo';
  } else if (mediaUrl) {
    mediaType = 'photo';
  }

  const { data, error } = await supabase
    .from('profile_posts')
    .insert({
      author_id: authorId,
      content: input.content.trim() || (mediaUrl ? 'Publication' : ''),
      media_url: mediaUrl,
      media_type: mediaType,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as ProfilePost;
}

export async function deleteProfilePost(postId: string): Promise<void> {
  const { error } = await supabase.from('profile_posts').delete().eq('id', postId);
  if (error) throw error;
}
