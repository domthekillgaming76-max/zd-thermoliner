import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  MessageSquare, Share2, Trash2, Pin, PinOff, MapPin, Radio, Megaphone,
} from 'lucide-react';
import type { WallPost, WallReactionType } from '../../lib/wallTypes';
import {
  WALL_POST_TYPE_COLORS,
  WALL_POST_TYPE_LABELS,
  WALL_VISIBILITY_LABELS,
  getAuthorDisplayName,
  getYouTubeEmbedUrl,
  isVideoUrl,
  isDirectVideoFile,
  timeAgo,
} from '../../lib/wallTypes';
import { WallUserAvatar } from './WallUserAvatar';
import { WallRoleBadge } from './WallRoleBadge';
import { WallReactionBar } from './WallReactionBar';
import { WallPollSection } from './WallPollSection';
import { WallCommentThread } from './WallCommentThread';

interface WallPostCardProps {
  post: WallPost;
  currentUserId?: string;
  canModerate?: boolean;
  canPin?: boolean;
  canComment?: boolean;
  canReact?: boolean;
  onReact: (type: WallReactionType | null) => void;
  onComment: (content: string) => void;
  onShare: () => void;
  onDelete: () => void;
  onPin: (pinned: boolean) => void;
  onVote?: (optionId: string) => void;
  onHideComment?: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  commentSubmitting?: boolean;
  sharePending?: boolean;
}

export function WallPostCard({
  post,
  currentUserId,
  canModerate,
  canPin,
  canComment = true,
  canReact = true,
  onReact,
  onComment,
  onShare,
  onDelete,
  onPin,
  onVote,
  onHideComment,
  onDeleteComment,
  commentSubmitting,
  sharePending,
}: WallPostCardProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const isOwner = post.author_id === currentUserId;
  const typeStyle = WALL_POST_TYPE_COLORS[post.post_type];
  const embedUrl = post.media_url ? getYouTubeEmbedUrl(post.media_url) : null;

  return (
    <article
      className={`wall-glass wall-card-hover rounded-2xl overflow-hidden border ${
        post.is_pinned ? 'border-amber-500/30 wall-pinned' : 'border-white/5'
      }`}
      style={{ animationDelay: '0ms' }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <WallUserAvatar author={post.author} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {post.author?.id ? (
                  <Link
                    to={`/profile/${post.author.id}`}
                    className="text-white font-semibold text-sm truncate hover:text-red-300 transition-colors"
                  >
                    {getAuthorDisplayName(post.author)}
                  </Link>
                ) : (
                  <p className="text-white font-semibold text-sm truncate">{getAuthorDisplayName(post.author)}</p>
                )}
                <WallRoleBadge role={post.author?.role} />
                {post.is_official && (
                  <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Megaphone className="w-2.5 h-2.5" /> Officiel
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <span className="text-white/25 text-xs">{timeAgo(post.created_at)}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${typeStyle}`}>
                  {WALL_POST_TYPE_LABELS[post.post_type]}
                </span>
                <span className="text-[9px] text-white/20">{WALL_VISIBILITY_LABELS[post.visibility]}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canPin && (
              <button type="button" onClick={() => onPin(!post.is_pinned)}
                className="w-7 h-7 hover:bg-amber-500/10 rounded-lg flex items-center justify-center"
                title={post.is_pinned ? 'Désépingler' : 'Épingler'}>
                {post.is_pinned ? <PinOff className="w-3.5 h-3.5 text-amber-400" /> : <Pin className="w-3.5 h-3.5 text-white/25" />}
              </button>
            )}
            {(isOwner || canModerate) && (
              <button type="button" onClick={onDelete}
                className="w-7 h-7 hover:bg-red-500/10 rounded-lg flex items-center justify-center">
                <Trash2 className="w-3.5 h-3.5 text-white/20 hover:text-red-400" />
              </button>
            )}
          </div>
        </div>

        <p className="text-white/85 text-sm leading-relaxed whitespace-pre-line">{post.content}</p>

        {post.media_url && post.post_type === 'photo' && (
          <img src={post.media_url} alt="" className="w-full max-h-80 object-cover rounded-xl mt-3 border border-white/5" />
        )}

        {post.media_url && (post.post_type === 'video' || isVideoUrl(post.media_url)) && (
          embedUrl ? (
            <div className="mt-3 aspect-video rounded-xl overflow-hidden border border-white/5">
              <iframe src={embedUrl} title="Vidéo" className="w-full h-full" allowFullScreen />
            </div>
          ) : isDirectVideoFile(post.media_url) ? (
            <video
              src={post.media_url}
              controls
              playsInline
              className="mt-3 w-full max-h-80 rounded-xl border border-white/5 bg-black"
            />
          ) : (
            <a href={post.media_url} target="_blank" rel="noreferrer"
              className="mt-3 flex items-center gap-2 text-sm text-red-400 hover:underline">
              Voir la vidéo
            </a>
          )
        )}

        {post.event && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/5 border border-red-500/15 text-xs text-white/50 space-y-1">
            <p className="font-bold text-red-400/80">
              {new Date(post.event.event_at).toLocaleString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
              })}
            </p>
            {post.event.location && (
              <p className="flex items-center gap-1"><MapPin className="w-3 h-3" />{post.event.location}</p>
            )}
            {post.event.route_label && (
              <p className="flex items-center gap-1"><Radio className="w-3 h-3" />{post.event.route_label}</p>
            )}
          </div>
        )}

        {post.poll && onVote && (
          <WallPollSection poll={post.poll} onVote={onVote} />
        )}
      </div>

      <div className="px-4 pb-3 flex items-center gap-4 flex-wrap">
        <WallReactionBar post={post} onReact={onReact} disabled={!canReact} />
        <button type="button" onClick={() => setCommentsOpen(!commentsOpen)}
          className="flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors">
          <MessageSquare className="w-4 h-4" />
          <span>{post.comments?.length ?? 0}</span>
        </button>
        <button type="button" onClick={onShare} disabled={sharePending || post.user_shared}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            post.user_shared ? 'text-emerald-400/60' : 'text-white/30 hover:text-white/60'
          }`}>
          <Share2 className="w-4 h-4" />
          <span>{post.share_count}</span>
        </button>
      </div>

      {commentsOpen && (
        <WallCommentThread
          comments={post.comments ?? []}
          canModerate={canModerate}
          canComment={canComment}
          onAdd={onComment}
          onHide={onHideComment}
          onDelete={onDeleteComment}
          submitting={commentSubmitting}
        />
      )}
    </article>
  );
}
