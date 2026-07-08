import { useState } from 'react';
import type { WallPost, WallReactionType } from '../../lib/wallTypes';
import { WALL_REACTION_EMOJI } from '../../lib/wallTypes';

const REACTION_TYPES: WallReactionType[] = ['like', 'love', 'fire', 'truck', 'celebrate'];

interface WallReactionBarProps {
  post: WallPost;
  onReact: (type: WallReactionType | null) => void;
  disabled?: boolean;
}

export function WallReactionBar({ post, onReact, disabled }: WallReactionBarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const counts = REACTION_TYPES.reduce<Record<string, number>>((acc, type) => {
    acc[type] = post.reactions?.filter(r => r.reaction_type === type && r.post_id).length ?? 0;
    return acc;
  }, {});
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onReact(post.user_reaction ? null : 'like')}
        onMouseEnter={() => !disabled && setShowPicker(true)}
        className={`flex items-center gap-1.5 text-sm transition-colors px-2 py-1 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed ${
          post.user_reaction ? 'text-red-400 bg-red-500/10' : 'text-white/30 hover:text-white/60 hover:bg-white/5'
        }`}
      >
        <span>{post.user_reaction ? WALL_REACTION_EMOJI[post.user_reaction] : '❤️'}</span>
        <span>{total}</span>
      </button>

      {showPicker && !disabled && (
        <div
          className="absolute bottom-full left-0 mb-1 flex gap-1 wall-glass rounded-xl p-1.5 border border-white/10 z-10"
          onMouseLeave={() => setShowPicker(false)}
        >
          {REACTION_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => { onReact(type); setShowPicker(false); }}
              className={`w-8 h-8 rounded-lg hover:bg-white/10 text-base transition-transform hover:scale-110 ${
                post.user_reaction === type ? 'bg-red-500/15' : ''
              }`}
              title={type}
            >
              {WALL_REACTION_EMOJI[type]}
            </button>
          ))}
        </div>
      )}

      {total > 0 && (
        <div className="flex gap-0.5">
          {REACTION_TYPES.filter(t => counts[t] > 0).map(type => (
            <span key={type} className="text-xs" title={`${counts[type]} ${type}`}>
              {WALL_REACTION_EMOJI[type]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
