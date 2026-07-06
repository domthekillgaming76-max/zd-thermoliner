import { useEffect, useState } from 'react';
import { Image, Send, Heart, MessageSquare, User, X, Trash2 } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Post } from '../lib/supabase';

export function WallPage() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [posting, setPosting] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPosts();
    const ch = supabase.channel('wall_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, loadPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, loadPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, loadPosts)
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, []);

  async function loadPosts() {
    try {
      const { data } = await supabase
        .from('posts')
        .select(`*, profiles(id, full_name, pseudo, avatar_url), likes(user_id), comments(id, content, user_id, created_at, profiles(full_name, pseudo, avatar_url))`)
        .order('created_at', { ascending: false })
        .limit(50);
      setPosts((data ?? []) as unknown as Post[]);
    } catch (err) { console.error('[Z&D] Wall:', err); }
    finally { setLoading(false); }
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      await supabase.from('posts').insert({ content: content.trim(), photo_url: photoUrl || null });
      setContent('');
      setPhotoUrl('');
      setShowPhotoInput(false);
      loadPosts();
    } finally { setPosting(false); }
  }

  async function handleLike(postId: string, liked: boolean) {
    if (!user) return;
    if (liked) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('likes').insert({ post_id: postId });
    }
    loadPosts();
  }

  async function handleComment(postId: string) {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    await supabase.from('comments').insert({ post_id: postId, content: text });
    setCommentInputs(p => ({ ...p, [postId]: '' }));
    loadPosts();
  }

  async function deletePost(id: string) {
    if (!confirm('Supprimer ce post ?')) return;
    await supabase.from('posts').delete().eq('id', id);
    loadPosts();
  }

  function toggleComments(postId: string) {
    setExpandedComments(prev => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  }

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`;
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  const displayName = profile?.pseudo || profile?.full_name || 'Vous';
  const initial = displayName[0]?.toUpperCase() ?? '?';

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Mur société</h1>
          <p className="text-white/30 text-sm mt-1">Partagez avec l'équipe Z&D Thermoliner</p>
        </div>

        {/* Compose */}
        <div className="card-premium p-4">
          <form onSubmit={handlePost}>
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm text-white"
                style={{ background: 'linear-gradient(135deg, #b91c1c, #7f1d1d)' }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                  : initial
                }
              </div>
              <div className="flex-1">
                <textarea value={content} onChange={e => setContent(e.target.value)}
                  placeholder="Quoi de neuf sur les routes ?"
                  rows={3}
                  className="w-full bg-transparent text-white placeholder-white/25 resize-none focus:outline-none text-sm leading-relaxed" />
                {showPhotoInput && (
                  <input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)}
                    placeholder="URL de l'image..."
                    className="w-full mt-2 px-3 py-2 bg-white/5 border rounded-xl text-white placeholder-white/25 focus:outline-none text-sm"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <button type="button" onClick={() => setShowPhotoInput(!showPhotoInput)}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors ${showPhotoInput ? 'text-red-400 bg-red-500/10' : 'text-white/30 hover:text-white/60'}`}>
                <Image className="w-4 h-4" />
                Photo
              </button>
              <button type="submit" disabled={posting || !content.trim()}
                className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40">
                <Send className="w-3.5 h-3.5" />
                {posting ? 'Envoi...' : 'Publier'}
              </button>
            </div>
          </form>
        </div>

        {/* Posts */}
        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="card-premium h-32 animate-pulse" />)}</div>
        ) : posts.length === 0 ? (
          <div className="card-premium p-16 text-center">
            <MessageSquare className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/30">Aucun post — soyez le premier à publier !</p>
          </div>
        ) : (
          posts.map(post => {
            const liked = post.likes?.some(l => l.user_id === user?.id) ?? false;
            const commentsOpen = expandedComments.has(post.id);
            const authorName = (post.profiles as {pseudo?: string | null; full_name?: string})?.pseudo || (post.profiles as {full_name?: string})?.full_name || 'Membre';
            const authorAvatar = (post.profiles as {avatar_url?: string | null})?.avatar_url;
            const isOwner = post.user_id === user?.id;
            return (
              <div key={post.id} className="card-premium overflow-hidden">
                <div className="p-4">
                  {/* Author row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm text-white overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #b91c1c, #7f1d1d)' }}>
                        {authorAvatar ? <img src={authorAvatar} alt="" className="w-full h-full object-cover" /> : authorName[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{authorName}</p>
                        <p className="text-white/25 text-xs">{timeAgo(post.created_at)}</p>
                      </div>
                    </div>
                    {isOwner && (
                      <button onClick={() => deletePost(post.id)}
                        className="w-7 h-7 hover:bg-red-500/10 rounded-lg flex items-center justify-center transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-white/20 hover:text-red-400" />
                      </button>
                    )}
                  </div>
                  {/* Content */}
                  <p className="text-white/80 text-sm leading-relaxed whitespace-pre-line">{post.content}</p>
                  {post.photo_url && (
                    <img src={post.photo_url} alt="" className="w-full max-h-72 object-cover rounded-xl mt-3" />
                  )}
                </div>

                {/* Actions */}
                <div className="px-4 pb-3 flex items-center gap-4">
                  <button onClick={() => handleLike(post.id, liked)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-red-400' : 'text-white/30 hover:text-white/60'}`}>
                    <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                    <span>{post.likes?.length ?? 0}</span>
                  </button>
                  <button onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors">
                    <MessageSquare className="w-4 h-4" />
                    <span>{post.comments?.length ?? 0}</span>
                  </button>
                </div>

                {/* Comments */}
                {commentsOpen && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    {(post.comments ?? []).map(c => {
                      const cName = (c.profiles as {pseudo?: string | null; full_name?: string})?.pseudo || (c.profiles as {full_name?: string})?.full_name || 'Membre';
                      return (
                        <div key={c.id} className="flex gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                            style={{ background: 'rgba(239,68,68,0.2)' }}>
                            {cName[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 bg-white/3 rounded-xl px-3 py-2">
                            <p className="text-xs font-semibold text-white/60 mb-0.5">{cName}</p>
                            <p className="text-sm text-white/70">{c.content}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex gap-2 pt-1">
                      <input value={commentInputs[post.id] ?? ''}
                        onChange={e => setCommentInputs(p => ({ ...p, [post.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(post.id); } }}
                        placeholder="Ajouter un commentaire..."
                        className="flex-1 px-3 py-2 bg-white/5 border rounded-xl text-white placeholder-white/20 focus:outline-none text-sm"
                        style={{ borderColor: 'rgba(255,255,255,0.07)' }} />
                      <button onClick={() => handleComment(post.id)}
                        className="w-9 h-9 bg-red-500/15 hover:bg-red-500/25 rounded-xl flex items-center justify-center transition-colors">
                        <Send className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Layout>
  );
}
