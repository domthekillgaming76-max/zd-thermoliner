import { Send } from 'lucide-react';
import { useState } from 'react';
import type { WallComment } from '../../lib/wallTypes';
import { timeAgo } from '../../lib/wallTypes';
import { WallUserAvatar } from './WallUserAvatar';
import { getAuthorDisplayName } from '../../lib/wallTypes';

interface WallCommentThreadProps {
  comments: WallComment[];
  canModerate?: boolean;
  onAdd: (content: string) => void;
  onHide?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  submitting?: boolean;
}

export function WallCommentThread({
  comments,
  canModerate,
  onAdd,
  onHide,
  onDelete,
  submitting,
}: WallCommentThreadProps) {
  const [text, setText] = useState('');

  function submit() {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText('');
  }

  return (
    <div className="border-t border-white/5 px-4 pb-4 pt-3 space-y-3">
      {comments.map(c => (
        <div key={c.id} className="flex gap-2.5 group">
          <WallUserAvatar author={c.author} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="wall-glass rounded-xl px-3 py-2">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className="text-xs font-semibold text-white/70">{getAuthorDisplayName(c.author)}</p>
                <span className="text-[10px] text-white/20">{timeAgo(c.created_at)}</span>
              </div>
              <p className="text-sm text-white/75 break-words">{c.content}</p>
            </div>
            {canModerate && (
              <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={() => onHide?.(c.id)}
                  className="text-[10px] text-amber-400/70 hover:text-amber-400">Masquer</button>
                <button type="button" onClick={() => onDelete?.(c.id)}
                  className="text-[10px] text-red-400/70 hover:text-red-400">Supprimer</button>
              </div>
            )}
          </div>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="Ajouter un commentaire…"
          className="flex-1 erp-input text-sm"
        />
        <button type="button" onClick={submit} disabled={submitting || !text.trim()}
          className="w-9 h-9 bg-red-500/15 hover:bg-red-500/25 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40">
          <Send className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  );
}
