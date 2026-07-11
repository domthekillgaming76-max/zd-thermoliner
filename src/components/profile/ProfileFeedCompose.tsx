import { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, Send, X } from 'lucide-react';
import type { NormalizedProfile } from '../../services/profileService';
import { resolveAvatarUrl } from '../../lib/profileDefaults';
import { getThemeOrDefault } from '../../lib/profileThemes';

interface ProfileFeedComposeProps {
  profile: NormalizedProfile;
  posting?: boolean;
  migrationRequired?: boolean;
  onSubmit: (input: { content: string; media_file?: File }) => void;
}

export function ProfileFeedCompose({
  profile,
  posting,
  migrationRequired,
  onSubmit,
}: ProfileFeedComposeProps) {
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const theme = getThemeOrDefault(profile.profile_theme);
  const primary = profile.primary_color ?? theme.primary;

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleFileChange(next: File | null) {
    clearFile();
    if (!next || !next.type.startsWith('image/')) return;
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && !file) return;
    onSubmit({ content, media_file: file ?? undefined });
    setContent('');
    clearFile();
  }

  return (
    <section
      className="profile-feed-compose rounded-2xl p-4 md:p-5 border border-white/8"
      style={{ boxShadow: `0 0 40px ${primary}12` }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Camera className="w-4 h-4" style={{ color: primary }} />
        <div>
          <h2 className="text-sm font-bold text-white">Fil d&apos;actualité</h2>
          <p className="text-[10px] text-white/35">Publiez une photo ou une actualité sur votre profil</p>
        </div>
      </div>

      {migrationRequired && (
        <p className="text-xs text-amber-400/90 mb-3 rounded-lg px-3 py-2 bg-amber-500/10 border border-amber-500/20">
          Migration 081 requise — exécutez la migration <code className="text-amber-200">081_profile_posts</code> dans Supabase.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <img
            src={resolveAvatarUrl(profile.avatar_url)}
            alt=""
            className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0"
          />
          <textarea
            className="erp-input flex-1 min-h-[72px] resize-none"
            placeholder="Quoi de neuf ? Partagez une photo de route, de votre camion..."
            value={content}
            onChange={e => setContent(e.target.value)}
            disabled={posting || migrationRequired}
          />
        </div>

        {preview && (
          <div className="relative rounded-xl overflow-hidden border border-white/10 max-h-64">
            <img src={preview} alt="Aperçu" className="w-full h-full object-cover max-h-64" />
            <button
              type="button"
              onClick={clearFile}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={posting || migrationRequired}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/5 border border-white/10 transition-colors disabled:opacity-40"
            >
              <ImagePlus className="w-4 h-4" />
              Photo
            </button>
          </div>
          <button
            type="submit"
            disabled={posting || migrationRequired || (!content.trim() && !file)}
            className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-40"
          >
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publier
          </button>
        </div>
      </form>
    </section>
  );
}
