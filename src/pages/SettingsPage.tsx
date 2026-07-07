import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings, Moon, Bell, Shield, HelpCircle, Info, ChevronRight, LogOut,
  AlertTriangle, X, KeyRound, Mail, ExternalLink,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { canAccessAdministration } from '../lib/adminPermissions';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';

const BLOCKED_ROLES = ['candidat', 'banni', 'ancien_membre'];
const PREFS_KEY = 'zd_erp_settings';

type SettingsSection = 'main' | 'security' | 'notifications' | 'help' | 'about';

interface UserPrefs {
  darkMode: boolean;
  notifications: boolean;
  emailAlerts: boolean;
}

function loadPrefs(): UserPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw) as UserPrefs;
  } catch { /* ignore */ }
  return { darkMode: true, notifications: true, emailAlerts: true };
}

function savePrefs(prefs: UserPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function SettingsPage() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<UserPrefs>(loadPrefs);
  const [section, setSection] = useState<SettingsSection>('main');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveStep, setLeaveStep] = useState<1 | 2>(1);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canLeave = profile && !BLOCKED_ROLES.includes(profile.role);
  const isAdmin = canAccessAdministration(profile?.role, user?.email ?? profile?.email);

  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  function updatePref<K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) {
    setPrefs(prev => ({ ...prev, [key]: value }));
  }

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
    await signOut();
    navigate('/login');
  }

  async function handlePasswordChange() {
    setPageError(null);
    setSuccessMessage(null);
    if (newPassword.length < 8) {
      setPageError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPageError('Les mots de passe ne correspondent pas.');
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) {
      setPageError(error.message);
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    setSuccessMessage('Mot de passe mis à jour.');
  }

  const menuItems: { id: SettingsSection; icon: typeof Shield; label: string; desc: string }[] = [
    { id: 'security', icon: Shield, label: 'Sécurité', desc: 'Mot de passe, authentification à deux facteurs' },
    { id: 'notifications', icon: Bell, label: 'Notifications', desc: 'Alertes push, emails' },
    { id: 'help', icon: HelpCircle, label: 'Aide', desc: 'Guide, FAQ, support' },
    { id: 'about', icon: Info, label: 'À propos', desc: 'Version, mentions légales' },
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(229,9,20,0.12)', border: '1px solid rgba(229,9,20,0.2)' }}>
            <Settings className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Paramètres</h1>
            {section !== 'main' && (
              <button type="button" onClick={() => setSection('main')} className="text-xs text-red-400 hover:text-red-300 mt-0.5">
                ← Retour
              </button>
            )}
          </div>
        </div>

        {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}
        {successMessage && <FormSuccess message={successMessage} onDismiss={() => setSuccessMessage(null)} />}

        {section === 'main' && (
          <>
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Moon className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="font-medium text-white">Mode sombre</p>
                    <p className="text-sm text-white/30">Thème Z&D Thermoliner (toujours actif)</p>
                  </div>
                </div>
                <button type="button" onClick={() => updatePref('darkMode', !prefs.darkMode)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${prefs.darkMode ? 'bg-red-500' : 'bg-white/10'}`}
                  aria-label="Mode sombre">
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${prefs.darkMode ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="font-medium text-white">Notifications</p>
                    <p className="text-sm text-white/30">Recevoir les alertes ERP</p>
                  </div>
                </div>
                <button type="button" onClick={() => updatePref('notifications', !prefs.notifications)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${prefs.notifications ? 'bg-red-500' : 'bg-white/10'}`}
                  aria-label="Notifications">
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${prefs.notifications ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              {menuItems.map((item, index) => (
                <button key={item.label} type="button" onClick={() => setSection(item.id)}
                  className={`w-full p-4 flex items-center justify-between transition-colors hover:bg-white/5 ${index > 0 ? 'border-t' : ''}`}
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

            {canLeave && (
              <div className="rounded-2xl p-5 space-y-4"
                style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <p className="text-sm font-bold text-red-400 uppercase tracking-wider">Zone dangereuse</p>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">Quitter l&apos;entreprise</p>
                    <p className="text-xs text-white/40 mt-0.5">Cette action est irréversible sans validation PDG</p>
                  </div>
                  <button type="button" onClick={() => { setShowLeaveModal(true); setLeaveStep(1); setLeaveReason(''); setLeaveError(null); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shrink-0"
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                    <LogOut className="w-4 h-4" />
                    Quitter
                  </button>
                </div>
              </div>
            )}

            <div className="text-center py-6">
              <p className="text-white/20 text-sm">Z&D Thermoliner ERP v2.0</p>
              <p className="text-white/10 text-xs mt-1">© 2026 Z&D Thermoliner</p>
            </div>
          </>
        )}

        {section === 'security' && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="font-bold text-white flex items-center gap-2"><KeyRound className="w-4 h-4 text-red-400" /> Changer le mot de passe</h2>
              <input type="password" className="erp-input w-full" placeholder="Nouveau mot de passe" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <input type="password" className="erp-input w-full" placeholder="Confirmer le mot de passe" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              <button type="button" disabled={passwordSaving} onClick={handlePasswordChange}
                className="btn-primary w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                {passwordSaving ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
              </button>
            </div>
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="font-bold text-white mb-2">Authentification à deux facteurs</h2>
              <p className="text-sm text-white/40">La 2FA sera disponible dans une prochaine mise à jour.</p>
            </div>
            {isAdmin && (
              <Link to="/administration"
                className="flex items-center justify-between rounded-2xl p-4 hover:bg-white/5 transition-colors"
                style={{ background: 'rgba(229,9,20,0.06)', border: '1px solid rgba(229,9,20,0.2)' }}>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="font-medium text-white">Centre d&apos;administration</p>
                    <p className="text-xs text-white/40">Utilisateurs, permissions, logs sécurité</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-white/30" />
              </Link>
            )}
          </div>
        )}

        {section === 'notifications' && (
          <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <ToggleRow
              icon={Bell}
              label="Alertes ERP"
              desc="Missions, feuilles de route, maintenance"
              enabled={prefs.notifications}
              onToggle={() => updatePref('notifications', !prefs.notifications)}
            />
            <ToggleRow
              icon={Mail}
              label="Alertes par email"
              desc="Résumés et notifications importantes"
              enabled={prefs.emailAlerts}
              onToggle={() => updatePref('emailAlerts', !prefs.emailAlerts)}
            />
            <p className="text-xs text-white/30 pt-2">Les préférences sont enregistrées sur cet appareil.</p>
          </div>
        )}

        {section === 'help' && (
          <div className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <HelpItem title="Créer une feuille de route" text="Feuilles de route → Nouvelle feuille. Les calculs se mettent à jour en temps réel." />
            <HelpItem title="Dispatch & missions" text="Le dispatch crée des missions et génère automatiquement une feuille de route à la livraison." />
            <HelpItem title="Recrutement" text="Les visiteurs peuvent postuler via Bureau du PDG. L'admin valide les candidatures." />
            <HelpItem title="Support" text="Contactez le PDG ou DOM76 sur Discord pour toute assistance." />
          </div>
        )}

        {section === 'about' && (
          <div className="rounded-2xl p-5 space-y-3 text-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-white font-bold text-lg">Z&D Thermoliner ERP</p>
            <p className="text-white/50">Version 2.0 — Edition transport RP</p>
            <p className="text-white/40">Modules : Chauffeurs, Flotte, Dispatch, Clients, Banque, Administration.</p>
            <p className="text-white/30 text-xs pt-4">Transport virtuel ETS2 — usage interne Z&D Thermoliner.</p>
          </div>
        )}
      </div>

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
              <button type="button" onClick={() => setShowLeaveModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/40">
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
                  <textarea value={leaveReason} onChange={e => setLeaveReason(e.target.value)}
                    placeholder="Motif de départ (facultatif)…" rows={3}
                    className="erp-input w-full min-h-[80px] resize-none" />
                </>
              ) : (
                <div className="text-center py-4">
                  <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-4" />
                  <p className="text-white font-bold text-lg mb-2">Dernière confirmation</p>
                  <p className="text-white/50 text-sm">Cette action désactive immédiatement ton compte membre.</p>
                </div>
              )}
              {leaveError && <FormAlert message={leaveError} />}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { if (leaveStep === 2) setLeaveStep(1); else setShowLeaveModal(false); }}
                  className="flex-1 py-3 rounded-xl text-sm text-white/50 bg-white/5">
                  {leaveStep === 2 ? 'Retour' : 'Annuler'}
                </button>
                <button type="button" onClick={confirmLeave} disabled={leaving}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-red-400 disabled:opacity-50"
                  style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>
                  {leaving ? 'En cours…' : leaveStep === 1 ? 'Continuer' : 'Quitter définitivement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function ToggleRow({ icon: Icon, label, desc, enabled, onToggle }: {
  icon: typeof Bell; label: string; desc: string; enabled: boolean; onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-red-400" />
        <div>
          <p className="font-medium text-white">{label}</p>
          <p className="text-sm text-white/30">{desc}</p>
        </div>
      </div>
      <button type="button" onClick={onToggle}
        className={`w-12 h-6 rounded-full transition-colors relative ${enabled ? 'bg-red-500' : 'bg-white/10'}`}>
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );
}

function HelpItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="py-3 border-b border-white/5 last:border-0">
      <p className="font-semibold text-white text-sm">{title}</p>
      <p className="text-white/40 text-xs mt-1">{text}</p>
    </div>
  );
}
