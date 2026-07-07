import { useEffect, useState, useRef } from 'react';
import { MessageSquare, Send, Hash, Plus, X } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase, ChatRoom, ChatMessage } from '../lib/supabase';

export function ChatPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.id);
      const channel = supabase
        .channel(`room-${selectedRoom.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${selectedRoom.id}`
        }, (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMsg as ChatMessage]);
        })
        .subscribe();
      return () => { channel.unsubscribe(); };
    }
  }, [selectedRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadRooms() {
    try {
      const { data } = await supabase.from('chat_rooms').select('*').order('created_at');
      if (data) {
        setRooms(data);
        if (data.length > 0 && !selectedRoom) {
          setSelectedRoom(data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  }

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
      const { data } = await supabase.from('chat_rooms').insert({
        name: newRoomName.trim(),
        type: 'public',
        created_by: user!.id,
      }).select().single();

      if (data) {
        setRooms(prev => [...prev, data]);
        setSelectedRoom(data);
        setShowNewRoom(false);
        setNewRoomName('');
      }
    } catch (error) {
      console.error('Error creating room:', error);
    }
  }

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-12rem)] md:h-[calc(100vh-8rem)] glass-container bg-dark-900/50 border border-dark-800 rounded-2xl overflow-hidden">
        {/* Rooms List */}
        <div className="w-64 border-r border-dark-800 flex flex-col hidden md:flex">
          <div className="p-4 border-b border-dark-800 flex items-center justify-between">
            <h2 className="font-semibold text-white">Salons</h2>
            <button onClick={() => setShowNewRoom(true)} className="p-1 hover:bg-dark-800 rounded">
              <Plus className="w-4 h-4 text-dark-400" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rooms.map(room => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={`w-full p-3 flex items-center gap-2 hover:bg-dark-800 transition-colors ${
                  selectedRoom?.id === room.id ? 'bg-dark-800 border-l-2 border-primary-500' : ''
                }`}
              >
                <Hash className="w-4 h-4 text-dark-500" />
                <span className="text-dark-200">{room.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedRoom ? (
            <>
              {/* Room Header */}
              <div className="p-4 border-b border-dark-800 flex items-center gap-3">
                <Hash className="w-5 h-5 text-dark-400" />
                <div>
                  <h3 className="font-semibold text-white">{selectedRoom.name}</h3>
                  {selectedRoom.description && (
                    <p className="text-sm text-dark-500">{selectedRoom.description}</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                  <p className="text-center text-white/30 text-sm py-8">Chargement des messages...</p>
                ) : messages.map((msg, i) => {
                  const isOwn = msg.user_id === user?.id;
                  const showAvatar = i === 0 || messages[i - 1]?.user_id !== msg.user_id;

                  return (
                    <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      {showAvatar ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
                          {msg.profiles?.avatar_url ? (
                            <img src={msg.profiles.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-sm text-white">{msg.profiles?.full_name?.[0] || '?'}</span>
                          )}
                        </div>
                      ) : <div className="w-8" />}
                      <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                        {showAvatar && (
                          <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                            <span className="text-sm font-medium text-dark-300">
                              {msg.profiles?.full_name || 'Utilisateur'}
                            </span>
                            <span className="text-xs text-dark-500">{formatTime(msg.created_at)}</span>
                          </div>
                        )}
                        <div className={`px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-primary-500 text-white rounded-br-md'
                            : 'bg-dark-800 text-dark-100 rounded-bl-md'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-dark-800 flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Ecrire un message..."
                  className="flex-1 px-4 py-2 bg-dark-800 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-dark-500">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Selectionnez un salon pour commencer</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Room Modal */}
      {showNewRoom && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Nouveau salon</h2>
              <button onClick={() => setShowNewRoom(false)} className="p-1 hover:bg-dark-800 rounded">
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <input
                type="text"
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                placeholder="Nom du salon"
                className="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
                autoFocus
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowNewRoom(false)} className="flex-1 px-4 py-2 bg-dark-800 text-white rounded-lg">
                  Annuler
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg">
                  Creer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Room Selector */}
      <div className="md:hidden fixed bottom-16 left-2 right-2 bg-dark-900/95 backdrop-blur-sm border border-dark-800 rounded-xl p-2 flex gap-2 overflow-x-auto">
        {rooms.map(room => (
          <button
            key={room.id}
            onClick={() => setSelectedRoom(room)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm ${
              selectedRoom?.id === room.id ? 'bg-primary-500 text-white' : 'bg-dark-800 text-dark-300'
            }`}
          >
            {room.name}
          </button>
        ))}
      </div>
    </Layout>
  );
}
