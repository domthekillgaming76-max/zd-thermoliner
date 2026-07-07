import { resolveAvatarUrl } from '../../lib/profileDefaults';
import { getAuthorDisplayName, type WallAuthor } from '../../lib/wallTypes';

interface WallUserAvatarProps {
  author?: WallAuthor | null;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'w-7 h-7 rounded-lg text-xs',
  md: 'w-9 h-9 rounded-xl text-sm',
  lg: 'w-11 h-11 rounded-xl text-base',
};

export function WallUserAvatar({ author, size = 'md' }: WallUserAvatarProps) {
  const name = getAuthorDisplayName(author);
  const initial = name[0]?.toUpperCase() ?? '?';
  const avatarUrl = author?.avatar_url?.trim();

  return (
    <div
      className={`${SIZES[size]} relative flex-shrink-0 flex items-center justify-center font-bold text-white overflow-hidden`}
      style={{ background: 'linear-gradient(135deg, #b91c1c, #7f1d1d)' }}
    >
      {avatarUrl ? (
        <img src={resolveAvatarUrl(avatarUrl)} alt="" className="w-full h-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}
