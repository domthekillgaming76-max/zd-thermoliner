import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Building2, AlertTriangle, Megaphone, Users, Radio } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';
import { WallCompose } from '../components/wall/WallCompose';
import { WallFeed } from '../components/wall/WallFeed';
import { WallLiveBadge, WallNewPostBanner } from '../components/wall/WallLiveBadge';
import { useAuth } from '../contexts/AuthContext';
import { useWall } from '../hooks/useWall';
import { canModerateWall, canPinWallPosts, canPublishOnWall } from '../lib/wallPermissions';
import type { CreateWallPostInput } from '../lib/wallTypes';

export function WallPage() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const accessDenied = (location.state as { accessDenied?: string } | null)?.accessDenied;
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    isLive,
    newPostReceived,
    markSeen,
    createPost,
    removePost,
    pinPost,
    comment,
    moderateComment,
    removeComment,
    react,
    vote,
    share,
  } = useWall(user?.id);

  const canModerate = canModerateWall(profile?.role, user?.email);
  const canPin = canPinWallPosts(profile?.role, user?.email);
  const canPublish = canPublishOnWall(profile?.role, user?.email);
  const posts = data?.posts ?? [];

  const stats = {
    total: posts.length,
    official: posts.filter(p => p.is_official).length,
    convoys: posts.filter(p => p.post_type === 'convoy').length,
    pinned: posts.filter(p => p.is_pinned).length,
  };

  async function handleCreate(input: CreateWallPostInput) {
    setPageError(null);
    try {
      await createPost.mutateAsync(input);
      setSuccessMessage('Publication envoyée.');
      markSeen();
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      setPageError((err as Error).message);
    }
  }

  async function handleDelete(postId: string) {
    if (!confirm('Supprimer cette publication ?')) return;
    try {
      await removePost.mutateAsync(postId);
    } catch (err) {
      setPageError((err as Error).message);
    }
  }

  function handleNewPostBanner() {
    markSeen();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 wall-module">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <PageHeader
            title="Mur de la société"
            subtitle="Réseau social interne Z&D Thermoliner — temps réel"
            icon={Building2}
          />
          <WallLiveBadge isLive={isLive} />
        </div>

        {accessDenied && (
          <div className="wall-glass rounded-xl px-4 py-3 text-sm text-amber-400 border border-amber-500/20 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {accessDenied}
          </div>
        )}

        <WallNewPostBanner visible={newPostReceived} onDismiss={handleNewPostBanner} />

        {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}
        {successMessage && <FormSuccess message={successMessage} onDismiss={() => setSuccessMessage(null)} />}
        {isError && <FormAlert message={(error as { message?: string })?.message ?? 'Erreur de chargement.'} />}

        {data?.migrationRequired && (
          <div className="wall-glass rounded-xl p-4 flex items-start gap-3 border border-amber-500/25">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-200">Mur social non installé</p>
              <p className="text-xs text-white/45 mt-1">
                Exécutez <code className="text-amber-300">npx supabase db push</code> (migrations 033 + 050)
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: 'Publications', value: stats.total, icon: Building2 },
            { label: 'Officielles', value: stats.official, icon: Megaphone },
            { label: 'Convois', value: stats.convoys, icon: Radio },
            { label: 'Épinglées', value: stats.pinned, icon: Users },
          ].map((s, i) => (
            <div key={s.label} className="wall-stat-card rounded-xl p-3" style={{ animationDelay: `${i * 40}ms` }}>
              <s.icon className="w-3.5 h-3.5 text-red-400 mb-1" />
              <p className="text-lg font-black text-white">{s.value}</p>
              <p className="text-[9px] text-white/35 uppercase">{s.label}</p>
            </div>
          ))}
        </div>

        {canPublish && (
          <WallCompose
            author={profile ? {
              id: profile.id,
              full_name: profile.full_name,
              pseudo: profile.pseudo,
              avatar_url: profile.avatar_url,
              role: profile.role,
            } : null}
            role={profile?.role}
            email={user?.email}
            posting={createPost.isPending}
            onSubmit={handleCreate}
          />
        )}

        <WallFeed
          posts={posts}
          loading={isLoading}
          currentUserId={user?.id}
          canModerate={canModerate}
          canPin={canPin}
          onReact={(postId, type) => react.mutate({ postId, type })}
          onComment={(postId, content) => comment.mutate({ postId, content })}
          onShare={postId => share.mutate(postId)}
          onDelete={handleDelete}
          onPin={(postId, pinned) => pinPost.mutate({ postId, pinned })}
          onVote={(pollId, optionId) => vote.mutate({ pollId, optionId })}
          onHideComment={id => moderateComment.mutate(id)}
          onDeleteComment={id => removeComment.mutate(id)}
          commentSubmitting={comment.isPending}
          sharePending={share.isPending}
        />
      </div>
    </Layout>
  );
}
