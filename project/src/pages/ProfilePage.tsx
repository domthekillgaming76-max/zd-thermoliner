import { useState } from 'react';
import { User, Camera, Truck, Save } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

export function ProfilePage() {
  const { profile, updateProfile, signOut } = useAuth();
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    pseudo: profile?.pseudo ?? '',
    avatar_url: profile?.avatar_url ?? '',
    truck_photo_url: profile?.truck_photo_url ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        full_name: form.full_name,
        pseudo: form.pseudo || null,
        avatar_url: form.avatar_url || null,
        truck_photo_url: form.truck_photo_url || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  const displayName = profile?.pseudo || profile?.full_name || 'Membre';
  const initial = displayName[0]?.toUpperCase() ?? '?';

  return (
    <Layout>
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Mon profil</h1>
          <p className="text-white/30 text-sm mt-1">{profile?.email}</p>
        </div>

        {/* Avatar preview */}
        <div className="card-premium p-6 flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center font-black text-3xl text-white"
            style={{ background: 'linear-gradient(135deg, #b91c1c, #7f1d1d)', boxShadow: '0 0 20px rgba(239,68,68,0.25)' }}>
            {form.avatar_url
              ? <img src={form.avatar_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              : initial
            }
          </div>
          <div>
            <p className="text-xl font-bold text-white">{displayName}</p>
            <p className="text-white/30 text-sm">{profile?.email}</p>
            <p className="text-red-400 text-xs mt-1 font-semibold uppercase tracking-wider">Membre Z&D Thermoliner</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="card-premium p-6 space-y-5">
          <h2 className="text-white font-bold flex items-center gap-2">
            <User className="w-4 h-4 text-red-400" />
            Informations
          </h2>

          {[
            { label: 'Nom complet', key: 'full_name', placeholder: 'Jean Dupont', icon: User },
            { label: 'Pseudo (affiché)', key: 'pseudo', placeholder: 'JeanD76', icon: User },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">{f.label}</label>
              <input value={(form as Record<string, string>)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 text-sm"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
            </div>
          ))}

          <div className="border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4 text-sm">
              <Camera className="w-4 h-4 text-red-400" />
              Photos
            </h3>
            {[
              { label: 'Photo de profil (URL)', key: 'avatar_url', placeholder: 'https://...' },
              { label: 'Photo de camion (URL)', key: 'truck_photo_url', placeholder: 'https://...' },
            ].map(f => (
              <div key={f.key} className="mb-4">
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">{f.label}</label>
                <input value={(form as Record<string, string>)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 text-sm"
                  style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                {(form as Record<string, string>)[f.key] && (
                  <img src={(form as Record<string, string>)[f.key]} alt="" className="w-full max-h-32 object-cover rounded-xl mt-2 border" style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>
            ))}
          </div>

          <button type="submit" disabled={saving}
            className="w-full btn-primary py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : saved ? 'Enregistré !' : 'Enregistrer les modifications'}
          </button>
        </form>

        {/* Account */}
        <div className="card-premium p-5">
          <h2 className="text-white font-bold mb-4 text-sm">Compte</h2>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-white text-sm">Email</p>
              <p className="text-white/30 text-xs">{profile?.email}</p>
            </div>
          </div>
          <div className="border-t pt-4 mt-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <button onClick={signOut}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors border"
              style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
