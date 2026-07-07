import { MessageSquare } from 'lucide-react';
import type { WallPost, WallReactionType } from '../../lib/wallTypes';
import { WallPostCard } from './WallPostCard';

interface WallFeedProps {
  posts: WallPost[];
  loading?: boolean;
  currentUserId?: string;
  canModerate?: boolean;
  canPin?: boolean;
  onReact: (postId: string, type: WallReactionType | null) => void;
  onComment: (postId: string, content: string) => void;
  onShare: (postId: string) => void;
  onDelete: (postId: string) => void;
  onPin: (postId: string, pinned: boolean) => void;
  onVote: (pollId: string, optionId: string) => void;
  onHideComment: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  commentSubmitting?: boolean;
  sharePending?: boolean;
}

export function WallFeed({
  posts,
  loading,
  currentUserId,
  canModerate,
  canPin,
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
}: WallFeedProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="wall-glass h-40 shimmer rounded-2xl" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="wall-glass rounded-2xl p-16 text-center">
        <MessageSquare className="w-12 h-12 text-white/10 mx-auto mb-3" />
        <p className="text-white/30">Aucune publication — soyez le premier à partager !</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post, i) => (
        <div key={post.id} className="wall-feed-item" style={{ animationDelay: `${i * 40}ms` }}>
          <WallPostCard
            post={post}
            currentUserId={currentUserId}
            canModerate={canModerate}
            canPin={canPin}
            onReact={type => onReact(post.id, type)}
            onComment={content => onComment(post.id, content)}
            onShare={() => onShare(post.id)}
            onDelete={() => onDelete(post.id)}
            onPin={pinned => onPin(post.id, pinned)}
            onVote={post.poll ? optionId => onVote(post.poll!.id, optionId) : undefined}
            onHideComment={onHideComment}
            onDeleteComment={onDeleteComment}
            commentSubmitting={commentSubmitting}
            sharePending={sharePending}
          />
        </div>
      ))}
    </div>
  );
}
