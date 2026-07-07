import { useState } from 'react';
import {
  Image, Video, Megaphone, Truck, BarChart2, Calendar, Users, Send, ChevronDown,
} from 'lucide-react';
import type { CreateWallPostInput, WallPostType, WallVisibility } from '../../lib/wallTypes';
import {
  WALL_POST_TYPE_LABELS,
  WALL_VISIBILITY_LABELS,
} from '../../lib/wallTypes';
import {
  canCreateOfficialPost,
  getAllowedPostTypes,
  getAllowedVisibilities,
  getDefaultVisibility,
} from '../../lib/wallPermissions';
import { WallUserAvatar } from './WallUserAvatar';
import type { WallAuthor } from '../../lib/wallTypes';

const TYPE_ICONS: Record<WallPostType, typeof Send> = {
  text: Send,
  photo: Image,
  video: Video,
  convoy: Truck,
  announcement: Megaphone,
  poll: BarChart2,
  event: Calendar,
  recruitment: Users,
};

interface WallComposeProps {
  author?: WallAuthor | null;
  role?: string | null;
  email?: string | null;
  posting?: boolean;
  onSubmit: (input: CreateWallPostInput) => void;
}

export function WallCompose({ author, role, email, posting, onSubmit }: WallComposeProps) {
  const allowedTypes = getAllowedPostTypes(role, email);
  const [postType, setPostType] = useState<WallPostType>('text');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [visibility, setVisibility] = useState<WallVisibility>(getDefaultVisibility(role, postType));
  const [isOfficial, setIsOfficial] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [eventAt, setEventAt] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventRoute, setEventRoute] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const visibilities = getAllowedVisibilities(role, email);
  const canOfficial = canCreateOfficialPost(role, email);

  function handleTypeChange(type: WallPostType) {
    setPostType(type);
    setVisibility(getDefaultVisibility(role, type));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit({
      post_type: postType,
      content: content.trim(),
      media_url: mediaUrl || undefined,
      visibility,
      is_official: isOfficial && canOfficial,
      poll_options: postType === 'poll' ? pollOptions.filter(o => o.trim()) : undefined,
      event_at: postType === 'event' ? eventAt : undefined,
      event_location: eventLocation || undefined,
      event_route: eventRoute || undefined,
    });
    setContent('');
    setMediaUrl('');
    setPollOptions(['', '']);
    setEventAt('');
    setEventLocation('');
    setEventRoute('');
    setIsOfficial(false);
  }

  return (
    <div className="wall-glass wall-compose rounded-2xl p-4 md:p-5">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <WallUserAvatar author={author} />
          <div className="flex-1 space-y-2">
            <div className="flex gap-1 flex-wrap">
              {allowedTypes.map(type => {
                const Icon = TYPE_ICONS[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                      postType === type
                        ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                        : 'text-white/35 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {WALL_POST_TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={
                postType === 'poll' ? 'Posez votre question…'
                : postType === 'convoy' ? 'Détails du convoi…'
                : postType === 'announcement' ? 'Annonce officielle…'
                : 'Quoi de neuf chez Z&D Thermoliner ?'
              }
              rows={3}
              className="w-full bg-transparent text-white placeholder-white/25 resize-none focus:outline-none text-sm leading-relaxed"
            />
          </div>
        </div>

        {(postType === 'photo' || postType === 'video') && (
          <input
            value={mediaUrl}
            onChange={e => setMediaUrl(e.target.value)}
            placeholder={postType === 'video' ? 'Lien YouTube / vidéo…' : 'URL de la photo…'}
            className="erp-input w-full text-sm"
          />
        )}

        {postType === 'poll' && (
          <div className="space-y-2 pl-12">
            {pollOptions.map((opt, i) => (
              <input
                key={i}
                value={opt}
                onChange={e => {
                  const next = [...pollOptions];
                  next[i] = e.target.value;
                  setPollOptions(next);
                }}
                placeholder={`Option ${i + 1}`}
                className="erp-input w-full text-sm"
              />
            ))}
            {pollOptions.length < 5 && (
              <button type="button" onClick={() => setPollOptions([...pollOptions, ''])}
                className="text-xs text-red-400 hover:text-red-300">+ Ajouter une option</button>
            )}
          </div>
        )}

        {postType === 'event' && (
          <div className="space-y-2 pl-12">
            <input type="datetime-local" value={eventAt} onChange={e => setEventAt(e.target.value)}
              className="erp-input w-full text-sm" />
            <input value={eventLocation} onChange={e => setEventLocation(e.target.value)}
              placeholder="Lieu" className="erp-input w-full text-sm" />
            <input value={eventRoute} onChange={e => setEventRoute(e.target.value)}
              placeholder="Itinéraire" className="erp-input w-full text-sm" />
          </div>
        )}

        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/50 pl-12">
          <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          Visibilité & options
        </button>

        {showAdvanced && (
          <div className="pl-12 flex flex-wrap gap-2 items-center">
            <select value={visibility} onChange={e => setVisibility(e.target.value as WallVisibility)}
              className="erp-select text-xs">
              {visibilities.map(v => (
                <option key={v} value={v}>{WALL_VISIBILITY_LABELS[v]}</option>
              ))}
            </select>
            {canOfficial && (
              <label className="flex items-center gap-2 text-xs text-white/40 cursor-pointer">
                <input type="checkbox" checked={isOfficial} onChange={e => setIsOfficial(e.target.checked)}
                  className="accent-red-500" />
                Publication officielle
              </label>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-white/5">
          <button type="submit" disabled={posting || !content.trim()}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40">
            <Send className="w-3.5 h-3.5" />
            {posting ? 'Publication…' : 'Publier'}
          </button>
        </div>
      </form>
    </div>
  );
}
