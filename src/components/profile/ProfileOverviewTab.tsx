import { LayoutGrid, Sparkles } from 'lucide-react';
import type { NormalizedProfile } from '../../services/profileService';
import type { ProfileCardStats } from '../../services/profileStatsService';
import { ProfileCard } from './ProfileCard';
import { ProfileWidgetGrid } from './ProfileWidgetGrid';
import { ProfileFeedCompose } from './ProfileFeedCompose';
import { ProfileFeedTimeline } from './ProfileFeedTimeline';
import { ProfilePreview } from './ProfilePreview';
import type { ProfileCustomizationForm } from '../../lib/profileThemes';
import type { ProfilePost } from '../../lib/profilePostTypes';

interface ProfileOverviewTabProps {
  profile: NormalizedProfile;
  stats: ProfileCardStats;
  form: ProfileCustomizationForm;
  isAdmin?: boolean;
  userId?: string;
  canEdit?: boolean;
  posts: ProfilePost[];
  postsLoading?: boolean;
  postsMigrationRequired?: boolean;
  posting?: boolean;
  deletingPostId?: string | null;
  onCreatePost?: (input: { content: string; media_file?: File }) => void;
  onDeletePost?: (id: string) => void;
}

export function ProfileOverviewTab({
  profile,
  stats,
  form,
  isAdmin,
  userId,
  canEdit = true,
  posts,
  postsLoading,
  postsMigrationRequired,
  posting,
  deletingPostId,
  onCreatePost,
  onDeletePost,
}: ProfileOverviewTabProps) {
  return (
    <div className="space-y-6 profile-overview-enter">
      <ProfileCard profile={profile} stats={stats} isOnline isAdmin={isAdmin} />

      <ProfileWidgetGrid profile={profile} stats={stats} />

      <div className={`grid gap-6 items-start ${canEdit ? 'xl:grid-cols-[1fr_300px]' : ''}`}>
        <div className="space-y-5">
          {canEdit && onCreatePost && (
            <ProfileFeedCompose
              profile={profile}
              posting={posting}
              migrationRequired={postsMigrationRequired}
              onSubmit={onCreatePost}
            />
          )}

          <section>
            <div className="flex items-center gap-2 mb-3">
              <LayoutGrid className="w-4 h-4 text-red-400" />
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">Publications récentes</h2>
            </div>
            <ProfileFeedTimeline
              posts={posts}
              loading={postsLoading}
              currentUserId={userId}
              deletingId={deletingPostId}
              onDelete={canEdit ? onDeletePost : undefined}
              readOnly={!canEdit}
            />
          </section>
        </div>

        {canEdit && (
          <aside className="xl:sticky xl:top-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/30">
              <Sparkles className="w-3.5 h-3.5" />
              Aperçu live
            </div>
            <ProfilePreview form={form} role={profile.role} email={profile.email} isAdmin={isAdmin} />
          </aside>
        )}
      </div>
    </div>
  );
}
