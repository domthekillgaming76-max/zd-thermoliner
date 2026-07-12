import { Link } from 'react-router-dom';
import { resolveAvatarUrl } from '../../lib/profileDefaults';
import { getAuthorDisplayName, type WallAuthor } from '../../lib/wallTypes';

interface WallUserAvatarProps {
  author?: WallAuthor | null;
  size?: 'sm' | 'md' | 'lg';
  linkToProfile?: boolean;
}

const SIZES = {
  sm: 'w-7 h-7 rounded-lg text-xs',
  md: 'w-9 h-9 rounded-xl text-sm',
  lg: 'w-11 h-11 rounded-xl text-base',
};

export function WallUserAvatar({ author, size = 'md', linkToProfile = true }: WallUserAvatarProps) {
  const name = getAuthorDisplayName(author);
  const initial = name[0]?.toUpperCase() ?? '?';
  const avatarUrl = author?.avatar_url?.trim();

  const inner = (
    <>
      {avatarUrl ? (
        <img src={resolveAvatarUrl(avatarUrl)} alt="" className="w-full h-full object-cover" />
      ) : (
        initial
      )}
    </>
  );

  const className = `${SIZES[size]} relative flex-shrink-0 flex items-center justify-center font-bold text-white overflow-hidden`;
  const style = { background: 'linear-gradient(135deg, #b91c1c, #7f1d1d)' };

  if (linkToProfile && author?.id) {
    return (
      <Link
        to={`/profile/${author.id}`}
        className={`${className} hover:ring-2 hover:ring-red-500/40 transition-shadow`}
        style={style}
        title={`Voir le profil de ${name}`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className={className} style={style}>
      {inner}
    </div>
  );
}
