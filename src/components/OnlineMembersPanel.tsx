import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Users, Circle, Zap, MapPin } from 'lucide-react';
import { useOnlinePresence } from '../hooks/useOnlinePresence';
import { RoleBadge } from './erp/RoleBadge';
import type { DisplayStatus } from '../services/onlinePresenceService';

const STATUS_LABELS: Record<DisplayStatus, string> = {
  online: 'En ligne',
  offline: 'Hors ligne',
};

const STATUS_DOT: Record<DisplayStatus, string> = {
  online: 'bg-emerald-400',
  offline: 'bg-white/25',
};

const STATUS_TEXT: Record<DisplayStatus, string> = {
  online: 'text-emerald-400/80',
  offline: 'text-white/35',
};

const STATUS_BG: Record<DisplayStatus, string> = {
  online: 'bg-emerald-500/10',
  offline: 'bg-white/5',
};

function MemberAvatar({ member }: { member: { avatar_url: string | null; truck_photo_url: string | null; full_name: string } }) {
  const src = member.truck_photo_url || member.avatar_url;
  const initial = member.full_name[0]?.toUpperCase() ?? '?';
  return (
    <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 ring-2 ring-red-500/30 bg-gradient-to-br from-red-500/20 to-red-700/20 flex items-center justify-center">
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-sm font-bold text-red-300">{initial}</span>
      )}
    </div>
  );
}

export function OnlineMembersPanel() {
  const { members, onlineCount } = useOnlinePresence();
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const panelContent = (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between gap-2 px-4 py-3.5 border-b"
        style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'linear-gradient(90deg, rgba(239,68,68,0.05), transparent)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/15 border border-red-500/25">
            <Users className="w-4 h-4 text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">Flotte en ligne</p>
            <p className="text-[10px] text-white/50">{onlineCount} chauffeur{onlineCount !== 1 ? 's' : ''} actif{onlineCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-white/5 text-white/40 hover:text-red-400 transition-colors"
          aria-label={open ? 'Replier le panneau' : 'Déplier le panneau'}
        >
          {open ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {(open || mobileOpen) && (
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-0">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-3">
              <Users className="w-8 h-8 text-white/20 mb-2" />
              <p className="text-center text-white/30 text-xs">Aucun chauffeur en ligne</p>
            </div>
          ) : (
            members.map(member => {
              const display = member.displayStatus;
              return (
                <Link
                  key={member.user_id}
                  to={`/profile/${member.user_id}`}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-200 border border-transparent hover:border-red-500/30 ${STATUS_BG[display]}`}
                >
                  <div className="relative flex-shrink-0">
                    <MemberAvatar member={member} />
                    <span
                      className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0e0e0e] ${STATUS_DOT[display]} shadow-lg`}
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-semibold truncate ${display === 'offline' ? 'text-white/40' : 'text-white'}`}>
                        {member.pseudo || member.full_name}
                      </p>
                      <RoleBadge role={member.role} size="xs" showIcon={false} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] flex items-center gap-1 ${STATUS_TEXT[display]}`}>
                        <Circle className={`w-1.5 h-1.5 fill-current ${display === 'offline' ? 'opacity-50' : ''}`} />
                        {STATUS_LABELS[display]}
                      </span>
                      {display === 'online' && (
                        <>
                          <span className="text-[10px] text-white/40 flex items-center gap-0.5">
                            <Zap className="w-3 h-3" /> En trajet
                          </span>
                          <span className="text-[10px] text-white/40 flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" /> Europe
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop — fixed right panel */}
      <aside
        className={`hidden lg:flex flex-col fixed right-0 top-0 h-full z-20 erp-sidebar transition-all duration-300 border-l ${
          open ? 'w-64' : 'w-12'
        }`}
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        {open ? (
          panelContent
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center h-full gap-2 text-white/40 hover:text-red-400 transition-colors"
            aria-label="Ouvrir membres en ligne"
          >
            <Users className="w-5 h-5" />
            {onlineCount > 0 && (
              <span className="text-[10px] font-bold text-emerald-400">{onlineCount}</span>
            )}
          </button>
        )}
      </aside>

      {/* Mobile — floating button + drawer */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(v => !v)}
          className="fixed bottom-20 right-4 z-40 flex items-center gap-1.5 px-3 py-2 rounded-full shadow-lg text-xs font-semibold text-white"
          style={{
            background: 'linear-gradient(135deg, rgba(220,38,38,0.9), rgba(127,29,29,0.85))',
            border: '1px solid rgba(239,68,68,0.35)',
          }}
        >
          <Users className="w-4 h-4" />
          En ligne
          {onlineCount > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-black/30 text-[10px] flex items-center justify-center">
              {onlineCount}
            </span>
          )}
        </button>

        {mobileOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setMobileOpen(false)} />
            <div
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] rounded-t-2xl overflow-hidden flex flex-col"
              style={{ background: '#0e0e0e', borderTop: '1px solid rgba(239,68,68,0.25)' }}
            >
              {panelContent}
            </div>
          </>
        )}
      </div>
    </>
  );
}
