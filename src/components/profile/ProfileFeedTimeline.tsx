import { Loader2, Trash2 } from 'lucide-react';
import type { ProfilePost } from '../../lib/profilePostTypes';

interface ProfileFeedTimelineProps {
  posts: ProfilePost[];
  loading?: boolean;
  currentUserId?: string;
  deletingId?: string | null;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ProfileFeedTimeline({
  posts,
  loading,
  currentUserId,
  deletingId,
  onDelete,
  readOnly = false,
}: ProfileFeedTimelineProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-red-400" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="profile-feed-empty rounded-2xl p-8 text-center border border-dashed border-white/10">
        <p className="text-sm text-white/50">Aucune publication pour l&apos;instant.</p>
        {!readOnly && (
          <p className="text-xs text-white/30 mt-1">Publiez votre première photo ci-dessus.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post, i) => (
        <article
          key={post.id}
          className="profile-feed-card opacity-0 animate-dashboard-in"
          style={{ animationDelay: `${i * 70}ms`, animationFillMode: 'forwards' }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-[10px] text-white/35 uppercase tracking-wide">{formatWhen(post.created_at)}</p>
            {currentUserId === post.author_id && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(post.id)}
                disabled={deletingId === post.id}
                className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
              >
                {deletingId === post.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          {post.media_url && post.media_type === 'photo' && (
            <div className="rounded-xl overflow-hidden mb-3 border border-white/8">
              <img
                src={post.media_url}
                alt=""
                className="w-full max-h-96 object-cover"
                loading="lazy"
              />
            </div>
          )}

          {post.content && (
            <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">{post.content}</p>
          )}
        </article>
      ))}
    </div>
  );
}
