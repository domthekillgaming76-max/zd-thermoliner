export type WallPostType =
  | 'text'
  | 'photo'
  | 'video'
  | 'convoy'
  | 'announcement'
  | 'poll'
  | 'event'
  | 'recruitment';

export type WallVisibility = 'public' | 'visitors' | 'members' | 'drivers' | 'admin';

export type WallReactionType = 'like' | 'love' | 'fire' | 'truck' | 'celebrate';

export interface WallAuthor {
  id: string;
  full_name: string;
  pseudo: string | null;
  avatar_url: string | null;
  role: string;
}

export interface WallReaction {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  user_id: string;
  reaction_type: WallReactionType;
  created_at: string;
}

export interface WallComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  is_hidden: boolean;
  created_at: string;
  author?: WallAuthor;
}

export interface WallPollOption {
  id: string;
  poll_id: string;
  label: string;
  sort_order: number;
  vote_count?: number;
}

export interface WallPoll {
  id: string;
  post_id: string;
  question: string;
  ends_at: string | null;
  options: WallPollOption[];
  user_vote_option_id?: string | null;
  total_votes?: number;
}

export interface WallEventMeta {
  id: string;
  post_id: string;
  event_at: string;
  location: string | null;
  route_label: string | null;
  community_event_id: string | null;
}

export interface WallPost {
  id: string;
  author_id: string;
  post_type: WallPostType;
  content: string;
  media_url: string | null;
  visibility: WallVisibility;
  is_pinned: boolean;
  is_official: boolean;
  share_count: number;
  created_at: string;
  updated_at: string;
  author?: WallAuthor;
  reactions?: WallReaction[];
  comments?: WallComment[];
  poll?: WallPoll | null;
  event?: WallEventMeta | null;
  user_reaction?: WallReactionType | null;
  user_shared?: boolean;
}

export interface CreateWallPostInput {
  post_type: WallPostType;
  content: string;
  media_url?: string;
  media_file?: File;
  visibility: WallVisibility;
  is_official?: boolean;
  poll_options?: string[];
  poll_ends_at?: string;
  event_at?: string;
  event_location?: string;
  event_route?: string;
}

export const WALL_POST_TYPE_LABELS: Record<WallPostType, string> = {
  text: 'Texte',
  photo: 'Photo',
  video: 'Vidéo',
  convoy: 'Convoi',
  announcement: 'Annonce',
  poll: 'Sondage',
  event: 'Événement',
  recruitment: 'Recrutement',
};

export const WALL_POST_TYPE_COLORS: Record<WallPostType, string> = {
  text: 'text-white/50 bg-white/5 border-white/10',
  photo: 'text-sky-400 bg-sky-500/10 border-sky-500/25',
  video: 'text-purple-400 bg-purple-500/10 border-purple-500/25',
  convoy: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
  announcement: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  poll: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  event: 'text-red-400 bg-red-500/10 border-red-500/25',
  recruitment: 'text-orange-400 bg-orange-500/10 border-orange-500/25',
};

export const WALL_VISIBILITY_LABELS: Record<WallVisibility, string> = {
  public: 'Public',
  visitors: 'Visiteurs',
  members: 'Membres',
  drivers: 'Chauffeurs',
  admin: 'Administration',
};

export const WALL_REACTION_EMOJI: Record<WallReactionType, string> = {
  like: '❤️',
  love: '😍',
  fire: '🔥',
  truck: '🚛',
  celebrate: '🎉',
};

export function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60_000) return "À l'instant";
  if (diff < 3_600_000) return `Il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `Il y a ${Math.floor(diff / 3_600_000)} h`;
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function getAuthorDisplayName(author?: WallAuthor | null): string {
  return author?.pseudo || author?.full_name || 'Membre';
}

export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /youtube|youtu\.be|vimeo|twitch|\.mp4|\.webm/i.test(url);
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export function isDirectVideoFile(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}
