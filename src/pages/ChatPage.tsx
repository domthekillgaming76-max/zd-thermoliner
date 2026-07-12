import { useCallback, useEffect, useRef, useState } from 'react';
import { Hash, MessageSquare, Pencil, Plus, Send, Sparkles, X } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase, type ChatRoom, type ChatMessage } from '../lib/supabase';

export function ChatPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [showEditRoom, setShowEditRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [roomIcon, setRoomIcon] = useState('💬');
  const [roomColor, setRoomColor] = useState('#ef4444');
  const [roomError, setRoomError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedRoom) return;

    void loadMessages(selectedRoom.id);
    const channel = supabase
      .channel(`room-${selectedRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${selectedRoom.id}`,
        },
        payload => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMsg as ChatMessage]);
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadRooms = useCallback(async () => {
    try {
      const { data } = await supabase.from('chat_rooms').select('*').order('created_at');
      if (data) {
        setRooms(data);
        if (data.length > 0) setSelectedRoom(current => current ?? data[0]);
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  async function loadMessages(roomId: string) {
    try {
      const { data } = await supabase
        .from('chat_messages')
        .select('*, profiles:user_id (*)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (data) setMessages(data as ChatMessage[]);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || !user) return;

    try {
      await supabase.from('chat_messages').insert({
        room_id: selectedRoom.id,
        user_id: user.id,
        content: newMessage.trim(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      const { data } = await supabase
        .from('chat_rooms')
        .insert({
          name: newRoomName.trim(),
          description: roomDescription.trim() || null,
          icon: roomIcon.trim() || '💬',
          accent_color: roomColor,
          type: 'public',
          created_by: user!.id,
        })
        .select()
        .single();

      if (data) {
        setRooms(prev => [...prev, data]);
        setSelectedRoom(data);
        setShowNewRoom(false);
        setNewRoomName('');
        setRoomDescription('');
        setRoomIcon('💬');
        setRoomColor('#ef4444');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      setRoomError('Impossible de créer le salon. Vérifiez que la dernière migration Supabase est appliquée.');
    }
  }

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  function openRoomEditor() {
    if (!selectedRoom) return;
    setNewRoomName(selectedRoom.name);
    setRoomDescription(selectedRoom.description ?? '');
    setRoomIcon(selectedRoom.icon ?? '💬');
    setRoomColor(selectedRoom.accent_color ?? '#ef4444');
    setRoomError('');
    setShowEditRoom(true);
  }

  function openRoomCreator() {
    setNewRoomName('');
    setRoomDescription('');
    setRoomIcon('💬');
    setRoomColor('#ef4444');
    setRoomError('');
    setShowNewRoom(true);
  }

  async function handleUpdateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRoom || !newRoomName.trim()) return;
    const { data, error } = await supabase
      .from('chat_rooms')
      .update({
        name: newRoomName.trim(),
        description: roomDescription.trim() || null,
        icon: roomIcon.trim() || '💬',
        accent_color: roomColor,
      })
      .eq('id', selectedRoom.id)
      .select()
      .single();
    if (error) {
      setRoomError('La personnalisation n’a pas pu être enregistrée.');
      return;
    }
    const updated = data as ChatRoom;
    setRooms(current => current.map(room => room.id === updated.id ? updated : room));
    setSelectedRoom(updated);
    setShowEditRoom(false);
  }

  const roomAccent = (room: ChatRoom) => room.accent_color ?? '#ef4444';

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getInitials(name?: string | null) {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  const roomCountLabel = rooms.length > 1
    ? `${rooms.length} salons actifs`
    : rooms.length === 1
      ? '1 salon actif'
      : 'Aucun salon';

  return (
    <Layout>
      <div className="space-y-4">
        <div className="rounded-[28px] border border-red-500/20 bg-gradient-to-br from-[#140909] via-[#0f0f0f] to-[#190b0b] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3">
                <MessageSquare className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-red-400/80">Salon interne</p>
                <h1 className="text-xl font-black text-white">Z&D Thermoliner</h1>
                <p className="mt-1 text-sm text-white/60">Messagerie opérationnelle et coordination d’équipe.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" /> Opérationnel
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/70">
                {roomCountLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(100vh-14rem)] overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0c0c]/80 shadow-[0_18px_50px_rgba(0,0,0,0.3)] md:h-[calc(100vh-9rem)]">
          <div className="hidden w-72 flex-col border-r border-white/10 bg-gradient-to-b from-[#111111] to-[#0a0a0a] md:flex">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Salons</h2>
                <p className="text-[11px] text-white/45">Espace de discussion</p>
              </div>
              <button
                onClick={openRoomCreator}
                className="rounded-xl border border-white/10 bg-white/5 p-2 transition-colors hover:border-red-500/20 hover:bg-red-500/10"
              >
                <Plus className="w-4 h-4 text-white/70" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {rooms.map(room => {
                const selected = selectedRoom?.id === room.id;
                return (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={`mb-2 flex w-full items-center gap-2 rounded-2xl border px-3 py-3 text-left transition-all ${
                      selected
                        ? 'border-red-500/25 bg-red-500/10 shadow-[0_0_0_1px_rgba(239,68,68,0.08)]'
                        : 'border-transparent bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-base"
                      style={{ backgroundColor: `${roomAccent(room)}22`, color: roomAccent(room) }}
                    >
                      {room.icon || <Hash className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{room.name}</p>
                      <p className="text-[11px] text-white/35">Salon actif</p>
                    </div>
                    {selected && <Sparkles className="w-4 h-4 text-red-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            {selectedRoom ? (
              <>
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-2xl text-lg"
                      style={{ backgroundColor: `${roomAccent(selectedRoom)}22`, color: roomAccent(selectedRoom) }}
                    >
                      {selectedRoom.icon || <Hash className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{selectedRoom.name}</h3>
                      {selectedRoom.description ? (
                        <p className="text-sm text-white/45">{selectedRoom.description}</p>
                      ) : (
                        <p className="text-sm text-white/45">Conversation interne Z&D Thermoliner</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={openRoomEditor} title="Personnaliser ce salon" className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/55 transition-colors hover:text-white">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                      Live
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.08),_transparent_55%)] p-4 space-y-4">
                  {loading ? (
                    <p className="py-8 text-center text-sm text-white/35">Chargement des messages...</p>
                  ) : messages.map((msg, i) => {
                    const isOwn = msg.user_id === user?.id;
                    const showAvatar = i === 0 || messages[i - 1]?.user_id !== msg.user_id;

                    return (
                      <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                        {showAvatar ? (
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-sm font-semibold text-white">
                            {msg.profiles?.avatar_url ? (
                              <img src={msg.profiles.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                            ) : (
                              <span>{getInitials(msg.profiles?.full_name)}</span>
                            )}
                          </div>
                        ) : (
                          <div className="w-9" />
                        )}
                        <div className={`max-w-[75%] ${isOwn ? 'text-right' : ''}`}>
                          {showAvatar && (
                            <div className={`mb-1 flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                              <span className="text-sm font-medium text-white/80">
                                {msg.profiles?.full_name || 'Utilisateur'}
                              </span>
                              <span className="text-[11px] text-white/35">{formatTime(msg.created_at)}</span>
                            </div>
                          )}
                          <div className={`rounded-[20px] px-4 py-2.5 ${
                            isOwn
                              ? 'bg-gradient-to-br from-red-600/90 to-red-700/90 text-white'
                              : 'border border-white/10 bg-white/[0.05] text-white/85'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="flex gap-3 border-t border-white/10 bg-[#0b0b0b] p-4">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Écrire un message..."
                    className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-red-500/30 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="rounded-2xl bg-red-600/90 px-4 py-2.5 text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-white/35">
                <div className="text-center">
                  <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p className="text-sm">Sélectionnez un salon pour commencer</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {(showNewRoom || showEditRoom) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#101010] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{showEditRoom ? 'Personnaliser le salon' : 'Nouveau salon'}</h2>
              <button onClick={() => { setShowNewRoom(false); setShowEditRoom(false); }} className="rounded-lg p-1 hover:bg-white/10">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            <form onSubmit={showEditRoom ? handleUpdateRoom : handleCreateRoom} className="space-y-4">
              <input
                type="text"
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                placeholder="Nom du salon"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white placeholder:text-white/30 focus:border-red-500/30 focus:outline-none"
                autoFocus
              />
              <textarea
                value={roomDescription}
                onChange={e => setRoomDescription(e.target.value)}
                placeholder="Description du salon (facultatif)"
                maxLength={180}
                className="min-h-20 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-red-500/30 focus:outline-none"
              />
              <div className="grid grid-cols-[72px_1fr] gap-3">
                <label className="space-y-1 text-[11px] text-white/45">
                  Emoji
                  <input value={roomIcon} onChange={e => setRoomIcon(e.target.value.slice(0, 4))} aria-label="Emoji du salon" className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-center text-lg text-white focus:outline-none" />
                </label>
                <div className="space-y-1 text-[11px] text-white/45">
                  Couleur d’accent
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'].map(color => (
                      <button key={color} type="button" onClick={() => setRoomColor(color)} aria-label={`Choisir la couleur ${color}`} className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${roomColor === color ? 'scale-110 border-white' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>
              </div>
              {roomError && <p className="text-xs text-red-400">{roomError}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowNewRoom(false); setShowEditRoom(false); }} className="flex-1 rounded-2xl bg-white/[0.06] px-4 py-2.5 text-white">
                  Annuler
                </button>
                <button type="submit" className="flex-1 rounded-2xl bg-red-600/90 px-4 py-2.5 text-white">
                  {showEditRoom ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="fixed bottom-16 left-2 right-2 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-[#0c0c0c]/95 p-2 backdrop-blur-sm md:hidden">
        {rooms.map(room => (
          <button
            key={room.id}
            onClick={() => setSelectedRoom(room)}
            className={`flex-shrink-0 rounded-xl px-4 py-2 text-sm ${
              selectedRoom?.id === room.id ? 'bg-red-600/90 text-white' : 'bg-white/[0.05] text-white/70'
            }`}
          >
            {room.name}
          </button>
        ))}
      </div>
    </Layout>
  );
}
