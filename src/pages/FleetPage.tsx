import { useEffect, useState } from 'react';
import { Truck as TruckIcon, Plus, Search, Building2, X, Trash2, Edit } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase, Truck, Garage } from '../lib/supabase';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:      { label: 'Actif',       color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  maintenance: { label: 'Maintenance', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  retired:     { label: 'Retraité',    color: 'text-white/30 bg-white/5 border-white/10' },
};

const EMPTY_FORM = { registration: '', brand: '', model: '', status: 'active' as const, mileage: 0, garage_id: '', photo_url: '' };

export function FleetPage() {
  const [trucks, setTrucks]   = useState<Truck[]>([]);
  const [garages, setGarages] = useState<Garage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Truck | null>(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    loadData();
    const ch = supabase.channel('fleet_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trucks' }, loadData)
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, []);

  async function loadData() {
    try {
      const [tRes, gRes] = await Promise.all([
        supabase.from('trucks').select('*').order('created_at', { ascending: false }),
        supabase.from('garages').select('id, name, city'),
      ]);
      setTrucks((tRes.data ?? []) as Truck[]);
      setGarages((gRes.data ?? []) as Garage[]);
    } catch (err) { console.error('[Z&D] Fleet:', err); }
    finally { setLoading(false); }
  }

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); }
  function openEdit(t: Truck) {
    setEditing(t);
    setForm({ registration: t.registration, brand: t.brand ?? '', model: t.model ?? '', status: t.status, mileage: t.mileage, garage_id: t.garage_id ?? '', photo_url: t.photo_url ?? '' });
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditing(null); setForm(EMPTY_FORM); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        registration: form.registration,
        brand: form.brand || null,
        model: form.model || null,
        status: form.status,
        mileage: form.mileage,
        garage_id: form.garage_id || null,
        photo_url: form.photo_url || null,
      };
      if (editing) {
        await supabase.from('trucks').update(payload).eq('id', editing.id);
      } else {
        await supabase.from('trucks').insert(payload);
      }
      closeModal();
      loadData();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce camion ?')) return;
    await supabase.from('trucks').delete().eq('id', id);
    loadData();
  }

  const filtered = trucks.filter(t =>
    [t.registration, t.brand, t.model].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center">
              <TruckIcon className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Flotte</h1>
              <p className="text-white/30 text-sm">{trucks.length} camion{trucks.length !== 1 ? 's' : ''}</p>
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
            <TruckIcon className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30">Aucun camion</p>
            <button onClick={openAdd} className="mt-4 text-red-400 text-sm hover:text-red-300">+ Ajouter le premier camion</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(truck => {
              const st = STATUS_LABELS[truck.status] ?? STATUS_LABELS.active;
              const garage = garages.find(g => g.id === truck.garage_id);
              return (
                <div key={truck.id} className="card-premium overflow-hidden group">
                  {/* Photo */}
                  <div className="h-40 bg-white/3 relative overflow-hidden">
                    {truck.photo_url
                      ? <img src={truck.photo_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <TruckIcon className="w-12 h-12 text-white/10" />
                        </div>
                    }
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      <button onClick={() => openEdit(truck)}
                        className="w-7 h-7 bg-black/60 rounded-lg flex items-center justify-center hover:bg-blue-500/30 transition-colors">
                        <Edit className="w-3.5 h-3.5 text-white/60" />
                      </button>
                      <button onClick={() => handleDelete(truck.id)}
                        className="w-7 h-7 bg-black/60 rounded-lg flex items-center justify-center hover:bg-red-500/30 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-white/60" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-white font-bold">{[truck.brand, truck.model].filter(Boolean).join(' ') || 'Camion sans nom'}</p>
                        <p className="text-white/40 text-xs font-mono mt-0.5">{truck.registration}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${st.color}`}>{st.label}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-white/40 mt-3">
                      <span>{truck.mileage.toLocaleString()} km</span>
                      {garage && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {garage.city || garage.name}
                        </span>
                      )}
                    </div>
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
              <h2 className="font-bold text-white">{editing ? 'Modifier' : 'Ajouter'} un camion</h2>
              <button onClick={closeModal} className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center">
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {[
                { label: 'Immatriculation *', key: 'registration', required: true, placeholder: 'AA-123-AA' },
                { label: 'Marque', key: 'brand', placeholder: 'Scania, Volvo...' },
                { label: 'Modèle', key: 'model', placeholder: 'R500, FH...' },
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
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Km</label>
                  <input type="number" min={0} value={form.mileage}
                    onChange={e => setForm(p => ({ ...p, mileage: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white focus:outline-none focus:border-red-500/50 text-sm"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Statut</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as Truck['status'] }))}
                    className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white focus:outline-none focus:border-red-500/50 text-sm"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <option value="active">Actif</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retraité</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Garage</label>
                <select value={form.garage_id} onChange={e => setForm(p => ({ ...p, garage_id: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white focus:outline-none focus:border-red-500/50 text-sm"
                  style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <option value="">Aucun garage</option>
                  {garages.map(g => <option key={g.id} value={g.id}>{g.name} — {g.city}</option>)}
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
