import { useEffect, useState, useRef } from 'react';
import { Route, Plus, MapPin, X, Trash2, Camera, Check, ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const CITIES = [
  'Paris', 'Lyon', 'Marseille', 'Lille', 'Bordeaux', 'Toulouse', 'Nice', 'Nantes',
  'Strasbourg', 'Montpellier', 'Rennes', 'Le Havre', 'Dijon', 'Grenoble', 'Rouen',
  'Calais', 'Metz', 'Brest', 'Limoges', 'Poitiers', 'Mulhouse',
  'Genève', 'Zurich', 'Milan', 'Barcelone', 'Madrid', 'Lisbonne',
  'Londres', 'Bruxelles', 'Amsterdam', 'Hambourg', 'Francfort', 'Munich', 'Berlin',
];

interface Sheet {
  id: string;
  driver_user_id: string | null;
  driver_name: string | null;
  departure: string | null;
  arrival: string | null;
  cargo: string | null;
  km: number;
  price_per_km: number;
  revenue: number;
  delivery_photo_url: string | null;
  validated: boolean;
  notes: string | null;
  date: string;
  created_at: string;
  // legacy columns that may exist
  total_distance?: number;
  departure_city?: string | null;
  arrival_city?: string | null;
  cargo_type?: string | null;
}

const EMPTY_FORM = {
  driver_name: '',
  departure: '',
  arrival: '',
  cargo: '',
  km: 0,
  price_per_km: 1.80,
  notes: '',
  date: new Date().toISOString().split('T')[0],
};

export function RoadSheetsPage() {
  const { user, profile } = useAuth();
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSheets();
    const ch = supabase.channel('roadsheets_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'road_sheets' }, loadSheets)
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, []);

  async function loadSheets() {
    try {
      const { data } = await supabase.from('road_sheets').select('*').order('date', { ascending: false });
      setSheets((data ?? []) as Sheet[]);
    } catch (err) { console.error('[Z&D] RoadSheets:', err); }
    finally { setLoading(false); }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!photoFile) return null;
    try {
      const ext = photoFile.name.split('.').pop();
      const path = `${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from('delivery-photos').upload(path, photoFile);
      if (error || !data) return null;
      return supabase.storage.from('delivery-photos').getPublicUrl(data.path).data.publicUrl;
    } catch { return null; }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const photoUrl = await uploadPhoto();
      const revenue = form.km * form.price_per_km;
      await supabase.from('road_sheets').insert({
        driver_user_id: user!.id,
        driver_name: form.driver_name || profile?.pseudo || profile?.full_name || 'Chauffeur',
        departure: form.departure || null,
        arrival: form.arrival || null,
        // also fill legacy columns in case they exist
        departure_city: form.departure || null,
        arrival_city: form.arrival || null,
        cargo: form.cargo || null,
        cargo_type: form.cargo || null,
        km: form.km,
        total_distance: form.km,
        price_per_km: form.price_per_km,
        revenue,
        delivery_photo_url: photoUrl,
        validated: false,
        notes: form.notes || null,
        date: form.date,
        status: 'submitted',
      });
      closeModal();
      loadSheets();
    } finally { setSaving(false); }
  }

  async function toggleValidate(sheet: Sheet) {
    await supabase.from('road_sheets').update({ validated: !sheet.validated }).eq('id', sheet.id);
    loadSheets();
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ?')) return;
    await supabase.from('road_sheets').delete().eq('id', id);
    loadSheets();
  }

  function closeModal() {
    setShowModal(false);
    setForm(EMPTY_FORM);
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  const revenue = form.km * form.price_per_km;
  const monthlyKm = sheets.filter(s => {
    const d = new Date(s.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, s) => sum + (s.km || s.total_distance || 0), 0);

  function getKm(s: Sheet) { return s.km || s.total_distance || 0; }
  function getDeparture(s: Sheet) { return s.departure || s.departure_city || '—'; }
  function getArrival(s: Sheet) { return s.arrival || s.arrival_city || '—'; }
  function getCargo(s: Sheet) { return s.cargo || s.cargo_type || '—'; }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center">
              <Route className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Feuilles de route</h1>
              <p className="text-white/30 text-sm">{sheets.length} feuille{sheets.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm">
            <Plus className="w-4 h-4" />
            Nouvelle feuille
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total feuilles', value: sheets.length },
            { label: 'Km ce mois', value: `${monthlyKm.toLocaleString()} km` },
            { label: 'Validées', value: sheets.filter(s => s.validated).length },
            { label: 'En attente', value: sheets.filter(s => !s.validated).length },
          ].map(s => (
            <div key={s.label} className="card-premium p-4">
              <p className="text-white/30 text-xs mb-1">{s.label}</p>
              <p className="text-2xl font-black text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="card-premium p-12 text-center text-white/20">Chargement...</div>
        ) : sheets.length === 0 ? (
          <div className="card-premium p-16 text-center">
            <Route className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30">Aucune feuille de route</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sheets.map(sheet => {
              const km = getKm(sheet);
              const isExpanded = expandedId === sheet.id;
              return (
                <div key={sheet.id} className="card-premium overflow-hidden">
                  <div className="p-4 flex items-center gap-3">
                    {/* Photo thumbnail */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center">
                      {sheet.delivery_photo_url
                        ? <img src={sheet.delivery_photo_url} alt="" className="w-full h-full object-cover" />
                        : <Camera className="w-5 h-5 text-white/15" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white">{sheet.driver_name || 'Chauffeur'}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sheet.validated ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'}`}>
                          {sheet.validated ? 'Validée' : 'En attente'}
                        </span>
                      </div>
                      <p className="text-xs text-white/30 mt-0.5">
                        {new Date(sheet.date).toLocaleDateString('fr-FR')} • {getDeparture(sheet)} → {getArrival(sheet)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-white font-semibold">{km.toLocaleString()} km</p>
                        <p className="text-xs text-emerald-400">+{(km * sheet.price_per_km).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</p>
                      </div>
                      <button onClick={() => toggleValidate(sheet)}
                        title={sheet.validated ? 'Marquer en attente' : 'Valider'}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${sheet.validated ? 'bg-emerald-500/20 hover:bg-emerald-500/10' : 'bg-white/5 hover:bg-emerald-500/20'}`}>
                        <Check className={`w-4 h-4 ${sheet.validated ? 'text-emerald-400' : 'text-white/30'}`} />
                      </button>
                      <button onClick={() => setExpandedId(isExpanded ? null : sheet.id)}
                        className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                      </button>
                      <button onClick={() => handleDelete(sheet.id)}
                        className="w-8 h-8 hover:bg-red-500/10 rounded-lg flex items-center justify-center">
                        <Trash2 className="w-4 h-4 text-white/20 hover:text-red-400" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      {sheet.delivery_photo_url && (
                        <img src={sheet.delivery_photo_url} alt="Livraison" className="w-full max-h-56 object-cover rounded-xl" />
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {[
                          { label: 'Cargaison', value: getCargo(sheet) },
                          { label: 'Prix/km', value: `${sheet.price_per_km} €` },
                          { label: 'Revenu brut', value: `${(km * sheet.price_per_km).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €` },
                          { label: 'Km parcourus', value: `${km.toLocaleString()} km` },
                        ].map(d => (
                          <div key={d.label} className="bg-white/3 rounded-lg p-2.5">
                            <p className="text-white/30 text-xs mb-0.5">{d.label}</p>
                            <p className="text-white font-semibold">{d.value}</p>
                          </div>
                        ))}
                      </div>
                      {sheet.notes && <p className="text-sm text-white/40 italic">{sheet.notes}</p>}
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-dark-900 border rounded-2xl w-full max-w-lg my-4" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <h2 className="font-bold text-white">Nouvelle feuille de route</h2>
              <button onClick={closeModal} className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center">
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Nom chauffeur</label>
                  <input value={form.driver_name} onChange={e => setForm(p => ({ ...p, driver_name: e.target.value }))}
                    placeholder={profile?.pseudo || profile?.full_name || 'Votre nom'}
                    className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 text-sm"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white focus:outline-none focus:border-red-500/50 text-sm"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Départ</label>
                  <select value={form.departure} onChange={e => setForm(p => ({ ...p, departure: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white focus:outline-none focus:border-red-500/50 text-sm"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <option value="">Sélectionner</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Arrivée</label>
                  <select value={form.arrival} onChange={e => setForm(p => ({ ...p, arrival: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white focus:outline-none focus:border-red-500/50 text-sm"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <option value="">Sélectionner</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Cargaison</label>
                  <input value={form.cargo} onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))}
                    placeholder="Acier, alimentaire..."
                    className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 text-sm"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Distance (km) *</label>
                  <input type="number" min={1} value={form.km || ''} required
                    onChange={e => setForm(p => ({ ...p, km: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white focus:outline-none focus:border-red-500/50 text-sm"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Prix au km (€)</label>
                <input type="number" step="0.01" min="0" value={form.price_per_km}
                  onChange={e => setForm(p => ({ ...p, price_per_km: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white focus:outline-none focus:border-red-500/50 text-sm"
                  style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
              </div>
              {form.km > 0 && (
                <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                  <Calculator className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-white/50">{form.km} km × {form.price_per_km} € =</span>
                  <span className="text-emerald-400 font-bold">{revenue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</span>
                </div>
              )}
              {/* Photo */}
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Photo de livraison (optionnelle)</label>
                <div onClick={() => fileRef.current?.click()}
                  className="rounded-xl border-2 border-dashed cursor-pointer hover:border-red-500/40 transition-colors"
                  style={{ borderColor: photoPreview ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)', minHeight: 80 }}>
                  {photoPreview
                    ? <img src={photoPreview} alt="" className="w-full max-h-36 object-cover rounded-xl" />
                    : <div className="flex flex-col items-center justify-center py-6 text-white/25">
                        <Camera className="w-7 h-7 mb-1" />
                        <span className="text-xs">Cliquer pour ajouter une photo</span>
                      </div>
                  }
                  <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} placeholder="Remarques optionnelles..."
                  className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 text-sm resize-none"
                  style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-3 bg-white/5 rounded-xl text-white/50 text-sm">Annuler</button>
                <button type="submit" disabled={saving || form.km <= 0}
                  className="flex-1 btn-primary py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50">
                  {saving ? 'Envoi...' : 'Soumettre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
