import { useEffect, useState } from 'react';
import { Building2, Plus, Search, MapPin, Truck, X, Trash2, Edit } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase, Garage } from '../lib/supabase';

const EMPTY = { name: '', city: '', address: '', capacity: 0, photo_url: '', monthly_rent: 0 };

export function GaragesPage() {
  const [garages, setGarages] = useState<Garage[]>([]);
  const [truckCounts, setTruckCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Garage | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
    const ch = supabase.channel('garages_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'garages' }, loadData)
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, []);

  async function loadData() {
    try {
      const [gRes, tRes] = await Promise.all([
        supabase.from('garages').select('*').order('name'),
        supabase.from('trucks').select('garage_id'),
      ]);
      setGarages((gRes.data ?? []) as Garage[]);
      const counts: Record<string, number> = {};
      (tRes.data ?? []).forEach(t => { if (t.garage_id) counts[t.garage_id] = (counts[t.garage_id] ?? 0) + 1; });
      setTruckCounts(counts);
    } catch (err) { console.error('[Z&D] Garages:', err); }
    finally { setLoading(false); }
  }

  function openAdd() { setEditing(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(g: Garage) {
    setEditing(g);
    setForm({ name: g.name, city: g.city ?? '', address: g.address ?? '', capacity: g.capacity, photo_url: g.photo_url ?? '', monthly_rent: g.monthly_rent ?? 0 });
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditing(null); setForm(EMPTY); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: form.name, city: form.city || null, address: form.address || null, capacity: form.capacity, photo_url: form.photo_url || null, monthly_rent: form.monthly_rent };
      if (editing) { await supabase.from('garages').update(payload).eq('id', editing.id); }
      else { await supabase.from('garages').insert(payload); }
      closeModal();
      loadData();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce garage ?')) return;
    await supabase.from('garages').delete().eq('id', id);
    loadData();
  }

  const filtered = garages.filter(g =>
    [g.name, g.city].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Garages</h1>
              <p className="text-white/30 text-sm">{garages.length} site{garages.length !== 1 ? 's' : ''}</p>
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

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="card-premium h-48 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-premium p-16 text-center">
            <Building2 className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30">Aucun garage</p>
            <button onClick={openAdd} className="mt-4 text-red-400 text-sm">+ Ajouter le premier garage</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(garage => {
              const count = truckCounts[garage.id] ?? 0;
              const fill = garage.capacity > 0 ? Math.min(100, Math.round(count / garage.capacity * 100)) : 0;
              return (
                <div key={garage.id} className="card-premium overflow-hidden group">
                  <div className="h-40 bg-white/3 relative overflow-hidden">
                    {garage.photo_url
                      ? <img src={garage.photo_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="w-12 h-12 text-white/10" />
                        </div>
                    }
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      <button onClick={() => openEdit(garage)}
                        className="w-7 h-7 bg-black/60 rounded-lg flex items-center justify-center hover:bg-blue-500/30 transition-colors">
                        <Edit className="w-3.5 h-3.5 text-white/60" />
                      </button>
                      <button onClick={() => handleDelete(garage.id)}
                        className="w-7 h-7 bg-black/60 rounded-lg flex items-center justify-center hover:bg-red-500/30 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-white/60" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-bold mb-1">{garage.name}</h3>
                    {garage.city && (
                      <div className="flex items-center gap-1.5 text-xs text-white/30 mb-3">
                        <MapPin className="w-3 h-3" />
                        {garage.city}
                        {garage.address && ` — ${garage.address}`}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-white/40 mb-2">
                      <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{count} / {garage.capacity} camions</span>
                      <span>{fill}% occupé</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${fill}%`, background: fill > 80 ? 'linear-gradient(90deg,#ef4444,#b91c1c)' : 'linear-gradient(90deg,#34d399,#10b981)' }} />
                    </div>
                    {(garage.monthly_rent ?? 0) > 0 && (
                      <p className="text-xs text-white/25 mt-2">{(garage.monthly_rent ?? 0).toLocaleString('fr-FR')} €/mois</p>
                    )}
                  </div>
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
              <h2 className="font-bold text-white">{editing ? 'Modifier' : 'Ajouter'} un garage</h2>
              <button onClick={closeModal} className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center">
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {[
                { label: 'Nom *', key: 'name', required: true, placeholder: 'Garage Le Havre' },
                { label: 'Ville', key: 'city', placeholder: 'Le Havre' },
                { label: 'Adresse', key: 'address', placeholder: '12 rue du Port' },
                { label: 'Photo (URL)', key: 'photo_url', placeholder: 'https://...' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">{f.label}</label>
                  <input value={(form as Record<string, string | number>)[f.key] as string}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    required={f.required} placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 text-sm"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Capacité</label>
                  <input type="number" min={0} value={form.capacity}
                    onChange={e => setForm(p => ({ ...p, capacity: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white focus:outline-none focus:border-red-500/50 text-sm"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Loyer (€/mois)</label>
                  <input type="number" min={0} value={form.monthly_rent}
                    onChange={e => setForm(p => ({ ...p, monthly_rent: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white focus:outline-none focus:border-red-500/50 text-sm"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                </div>
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
