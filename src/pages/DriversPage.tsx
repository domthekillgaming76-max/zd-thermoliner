import { useEffect, useState } from 'react';
import { Users, Search, Plus, X, Trash2, Edit, Phone, Truck } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase, Driver } from '../lib/supabase';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:   { label: 'Actif',    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  inactive: { label: 'Inactif',  color: 'text-white/30 bg-white/5 border-white/10' },
  on_leave: { label: 'En congé', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
};
const EMPTY = { name: '', pseudo: '', phone: '', license_number: '', status: 'active' as const, photo_url: '' };

export function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDrivers();
    const ch = supabase.channel('drivers_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, loadDrivers)
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, []);

  async function loadDrivers() {
    try {
      const { data } = await supabase.from('drivers').select('*').order('name');
      setDrivers((data ?? []) as Driver[]);
    } catch (err) { console.error('[Z&D] Drivers:', err); }
    finally { setLoading(false); }
  }

  function openAdd() { setEditing(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(d: Driver) {
    setEditing(d);
    setForm({ name: d.name, pseudo: d.pseudo ?? '', phone: d.phone ?? '', license_number: d.license_number ?? '', status: d.status, photo_url: d.photo_url ?? '' });
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditing(null); setForm(EMPTY); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: form.name, pseudo: form.pseudo || null, phone: form.phone || null, license_number: form.license_number || null, status: form.status, photo_url: form.photo_url || null };
      if (editing) { await supabase.from('drivers').update(payload).eq('id', editing.id); }
      else { await supabase.from('drivers').insert(payload); }
      closeModal();
      loadDrivers();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce chauffeur ?')) return;
    await supabase.from('drivers').delete().eq('id', id);
    loadDrivers();
  }

  const filtered = drivers.filter(d =>
    [d.name, d.pseudo].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Chauffeurs</h1>
              <p className="text-white/30 text-sm">{drivers.length} chauffeur{drivers.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="pl-9 pr-4 py-2.5 bg-white/5 border rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-red-500/50 text-sm w-48"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
            </div>
            <button onClick={openAdd}
              className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm">
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Actifs', value: drivers.filter(d => d.status === 'active').length, color: 'text-emerald-400' },
            { label: 'Inactifs', value: drivers.filter(d => d.status === 'inactive').length, color: 'text-white/40' },
            { label: 'En congé', value: drivers.filter(d => d.status === 'on_leave').length, color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="card-premium p-4 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-white/30 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="card-premium h-36 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-premium p-16 text-center">
            <Users className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30">Aucun chauffeur</p>
            <button onClick={openAdd} className="mt-4 text-red-400 text-sm">+ Ajouter le premier chauffeur</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(driver => {
              const st = STATUS_LABELS[driver.status] ?? STATUS_LABELS.active;
              return (
                <div key={driver.id} className="card-premium p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-lg text-white"
                      style={{ background: 'linear-gradient(135deg, #b91c1c, #7f1d1d)' }}>
                      {driver.photo_url
                        ? <img src={driver.photo_url} alt="" className="w-full h-full object-cover" />
                        : driver.name[0]?.toUpperCase()
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold truncate">{driver.name}</p>
                      {driver.pseudo && <p className="text-white/40 text-xs truncate">@{driver.pseudo}</p>}
                      <span className={`inline-flex mt-1 text-xs px-2 py-0.5 rounded-full border font-medium ${st.color}`}>{st.label}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(driver)}
                        className="w-7 h-7 hover:bg-blue-500/10 rounded-lg flex items-center justify-center transition-colors">
                        <Edit className="w-3.5 h-3.5 text-white/20 hover:text-blue-400" />
                      </button>
                      <button onClick={() => handleDelete(driver.id)}
                        className="w-7 h-7 hover:bg-red-500/10 rounded-lg flex items-center justify-center transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-white/20 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                  {driver.phone && (
                    <div className="flex items-center gap-2 text-xs text-white/30">
                      <Phone className="w-3 h-3" />
                      {driver.phone}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border rounded-2xl w-full max-w-md" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <h2 className="font-bold text-white">{editing ? 'Modifier' : 'Ajouter'} un chauffeur</h2>
              <button onClick={closeModal} className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center">
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {[
                { label: 'Nom complet *', key: 'name', required: true, placeholder: 'Jean Dupont' },
                { label: 'Pseudo', key: 'pseudo', placeholder: 'JeanD' },
                { label: 'Téléphone', key: 'phone', placeholder: '+33 6 00 00 00 00' },
                { label: 'N° de permis', key: 'license_number', placeholder: 'CE-1234567' },
                { label: 'Photo (URL)', key: 'photo_url', placeholder: 'https://...' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">{f.label}</label>
                  <input value={(form as Record<string, string>)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    required={f.required} placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 text-sm"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Statut</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as Driver['status'] }))}
                  className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white focus:outline-none focus:border-red-500/50 text-sm"
                  style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                  <option value="on_leave">En congé</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-2.5 bg-white/5 rounded-xl text-white/50 text-sm">Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 btn-primary py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
