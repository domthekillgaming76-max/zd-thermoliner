import type { WallPoll } from '../../lib/wallTypes';

interface WallPollSectionProps {
  poll: WallPoll;
  onVote: (optionId: string) => void;
  voting?: boolean;
}

export function WallPollSection({ poll, onVote, voting }: WallPollSectionProps) {
  const total = poll.total_votes ?? 0;
  const hasVoted = !!poll.user_vote_option_id;

  return (
    <div className="mt-3 space-y-2 p-3 rounded-xl bg-white/3 border border-white/5">
      <p className="text-xs font-bold text-white/60">{poll.question}</p>
      {poll.options.map(opt => {
        const pct = total > 0 ? Math.round(((opt.vote_count ?? 0) / total) * 100) : 0;
        const selected = poll.user_vote_option_id === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={voting || (hasVoted && !selected)}
            onClick={() => !hasVoted && onVote(opt.id)}
            className={`w-full text-left relative overflow-hidden rounded-lg border px-3 py-2 transition-colors ${
              selected ? 'border-red-500/40 bg-red-500/10' : 'border-white/8 hover:border-white/15'
            } ${hasVoted ? 'cursor-default' : 'cursor-pointer'}`}
          >
            {hasVoted && (
              <div
                className="absolute inset-y-0 left-0 bg-red-500/15 transition-all"
                style={{ width: `${pct}%` }}
              />
            )}
            <div className="relative flex justify-between items-center gap-2">
              <span className="text-sm text-white/80">{opt.label}</span>
              {hasVoted && <span className="text-[10px] text-white/40">{pct}%</span>}
            </div>
          </button>
        );
      })}
      <p className="text-[10px] text-white/25">{total} vote{total !== 1 ? 's' : ''}</p>
    </div>
  );
}
