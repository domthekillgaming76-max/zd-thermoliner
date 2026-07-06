import { useState } from 'react';
import { Settings, Moon, Sun, Bell, Shield, HelpCircle, Info, ChevronRight, LogOut, AlertTriangle, X } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const BLOCKED_ROLES = ['candidat', 'banni', 'ancien_membre'];

export function SettingsPage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveStep, setLeaveStep] = useState<1 | 2>(1);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const canLeave = profile && !BLOCKED_ROLES.includes(profile.role);

  async function confirmLeave() {
    if (leaveStep === 1) { setLeaveStep(2); return; }
    setLeaving(true);
    setLeaveError(null);
    const { error } = await supabase.rpc('leave_company', { reason: leaveReason || null });
    if (error) {
      setLeaveError(error.message);
      setLeaving(false);
      return;
    }
    // Sign out and redirect
    await signOut();
    navigate('/login');
  }

  const menuItems = [
    { icon: Shield, label: 'Sécurité', desc: 'Mot de passe, authentification à deux facteurs' },
    { icon: Bell, label: 'Notifications', desc: 'Alertes push, emails' },
    { icon: HelpCircle, label: 'Aide', desc: 'Guide, FAQ, support' },
    { icon: Info, label: 'À propos', desc: 'Version, mentions légales' },
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-0">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(229,9,20,0.12)', border: '1px solid rgba(229,9,20,0.2)' }}>
            <Settings className="w-5 h-5 text-red-400" />
          </div>
          <h1 className="text-2xl font-black text-white">Paramètres</h1>
        </div>

        {/* Theme Toggle */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="w-5 h-5 text-red-400" /> : <Sun className="w-5 h-5 text-yellow-400" />}
              <div>
                <p className="font-medium text-white">Mode sombre</p>
                <p className="text-sm text-white/30">Activer le thème sombre</p>
              </div>
            </div>
            <button onClick={() => setDarkMode(!darkMode)}
              className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-red-500' : 'bg-white/10'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Notifications Toggle */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-red-400" />
              <div>
                <p className="font-medium text-white">Notifications</p>
                <p className="text-sm text-white/30">Recevoir les alertes</p>
              </div>
            </div>
            <button onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 rounded-full transition-colors relative ${notifications ? 'bg-red-500' : 'bg-white/10'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          {menuItems.map((item, index) => (
            <button key={item.label}
              className={`w-full p-4 flex items-center justify-between transition-colors hover:bg-white/5 ${
                index > 0 ? 'border-t' : ''
              }`}
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-white/30" />
                <div className="text-left">
                  <p className="font-medium text-white">{item.label}</p>
                  <p className="text-sm text-white/30">{item.desc}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/20" />
            </button>
          ))}
        </div>

        {/* Danger Zone */}
        {canLeave && (
          <div className="rounded-2xl p-5 space-y-4"
            style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <p className="text-sm font-bold text-red-400 uppercase tracking-wider">Zone dangereuse</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Quitter l'entreprise</p>
                <p className="text-xs text-white/40 mt-0.5">Cette action est irréversible sans validation PDG</p>
              </div>
              <button onClick={() => { setShowLeaveModal(true); setLeaveStep(1); setLeaveReason(''); setLeaveError(null); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                <LogOut className="w-4 h-4" />
                Quitter
              </button>
            </div>
          </div>
        )}

        {/* App Info */}
        <div className="text-center py-6">
          <p className="text-white/20 text-sm">Z&D Thermoliner v2.0 RP Edition</p>
          <p className="text-white/10 text-xs mt-1">© 2024 Z&D Thermoliner. Tous droits réservés.</p>
        </div>
      </div>

      {/* Leave confirmation modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(180deg, #1a0505 0%, #0d0d0d 100%)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h2 className="text-white font-bold">
                  {leaveStep === 1 ? 'Quitter Z&D Thermoliner' : 'Confirmation finale'}
                </h2>
              </div>
              <button onClick={() => setShowLeaveModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {leaveStep === 1 ? (
                <>
                  <p className="text-white/70 text-sm leading-relaxed">
                    Es-tu sûr de vouloir quitter <strong className="text-white">Z&D Thermoliner</strong> ?
                  </p>
                  <ul className="text-xs text-white/40 space-y-1.5">
                    <li>• Ton accès aux salons internes sera immédiatement désactivé</li>
                    <li>• Ton historique de feuilles de route sera conservé</li>
                    <li>• Tu pourras refaire une candidature plus tard</li>
                  </ul>
                  <div>
                    <label className="block text-xs text-white/40 mb-2">Motif de départ (facultatif)</label>
                    <textarea value={leaveReason} onChange={e => setLeaveReason(e.target.value)}
                      placeholder="Raison de ton départ..."
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white/70 placeholder-white/20 outline-none resize-none"
                      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }} />
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-white font-bold text-lg mb-2">Dernière confirmation</p>
                  <p className="text-white/50 text-sm">
                    Cette action va <strong className="text-red-400">immédiatement</strong> désactiver ton compte membre.
                    Es-tu absolument certain ?
                  </p>
                </div>
              )}

              {leaveError && (
                <p className="text-red-400 text-xs px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {leaveError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => { if (leaveStep === 2) setLeaveStep(1); else setShowLeaveModal(false); }}
                  className="flex-1 py-3 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                  {leaveStep === 2 ? 'Retour' : 'Annuler'}
                </button>
                <button onClick={confirmLeave} disabled={leaving}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>
                  {leaving ? 'En cours...' : leaveStep === 1 ? 'Continuer' : 'Quitter définitivement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
