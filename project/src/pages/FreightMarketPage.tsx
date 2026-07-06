import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, MapPin, Truck, Clock, TrendingUp, Zap, RefreshCw,
  ChevronRight, Filter, AlertTriangle, CheckCircle, Play, Lock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';

type FreightStatus = 'disponible' | 'reserve' | 'en_cours' | 'termine' | 'expire';

type Freight = {
  id: string;
  departure_city: string;
  departure_company: string;
  arrival_city: string;
  arrival_company: string;
  cargo: string;
  trailer_type: string;
  weight_tons: number;
  distance_km: number;
  price_per_km: number;
  gross_revenue: number;
  deadline_hours: number;
  difficulty: string;
  status: FreightStatus;
  assigned_driver_id: string | null;
  assigned_user_id: string | null;
  road_sheet_id: string | null;
  created_by: string;
  expires_at: string | null;
  created_at: string;
};

type Driver = { id: string; name: string; user_id: string | null; truck_id: string | null };
type Truck = { id: string; model: string | null; registration: string };

const CITIES = [
  'Le Havre', 'Paris', 'Lille', 'Lyon', 'Marseille', 'Strasbourg',
  'Rotterdam', 'Amsterdam', 'Hambourg', 'Bruxelles', 'Milan', 'Turin', 'Barcelone',
  'Bordeaux', 'Nantes', 'Metz', 'Calais', 'Dunkerque', 'Cologne', 'Francfort',
];

const COMPANIES = [
  'DSV Logistics', 'DHL Freight', 'DB Schenker', 'Geodis', 'XPO Logistics',
  'Bolloré Logistics', 'FM Logistic', 'Kuehne+Nagel', 'Rhenus', 'Stef Transport',
  'Alloin', 'Norbert Dentressangle', 'ID Logistics', 'Ceva Logistics', 'Viapost',
];

const CARGOES = [
  'Acier en bobines', 'Palettes alimentaires', 'Produits surgelés', 'Matériaux de construction',
  'Produits chimiques', 'Appareils électroménagers', 'Automobile (pièces)', 'Bois de construction',
  'Céréales en vrac', 'Liquides alimentaires', 'Engrais agricoles', 'Papier en rouleaux',
  'Conteneur standard', 'Ferraille industrielle', 'Verre plat', 'Carburant (citerne)',
];

const TRAILERS: Record<string, string[]> = {
  'Tautliner': ['#3b82f6', 'bg-blue-500/10 border-blue-500/30'],
  'Frigo': ['#06b6d4', 'bg-cyan-500/10 border-cyan-500/30'],
  'Citerne': ['#f59e0b', 'bg-amber-500/10 border-amber-500/30'],
  'Plateau': ['#8b5cf6', 'bg-violet-500/10 border-violet-500/30'],
  'Benne': ['#ef4444', 'bg-red-500/10 border-red-500/30'],
  'Fourgon': ['#10b981', 'bg-emerald-500/10 border-emerald-500/30'],
};

const DIFFICULTIES: Record<string, { color: string; bg: string; icon: string }> = {
  'Facile':   { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: '●' },
  'Moyen':    { color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30',   icon: '◆' },
  'Difficile':{ color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30', icon: '▲' },
  'Expert':   { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',       icon: '★' },
};

const ROLE_LEVELS: Record<string, number> = {
  pdg: 100, patron: 90, directeur: 70, dispatcher: 50, chauffeur: 30, tractionnaire: 20, candidat: 10,
};

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min: number, max: number, dec: number): number {
  const v = Math.random() * (max - min) + min;
  return parseFloat(v.toFixed(dec));
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFreightRow(userId: string, count: number) {
  const rows = [];
  const trailerKeys = Object.keys(TRAILERS);
  const difficulties = ['Facile', 'Facile', 'Moyen', 'Moyen', 'Difficile', 'Expert'];

  for (let i = 0; i < count; i++) {
    let depCity = pick(CITIES);
    let arrCity = pick(CITIES);
    while (arrCity === depCity) arrCity = pick(CITIES);

    const dist = rand(120, 1800);
    const priceKm = randFloat(2.2, 4.8, 3);
    const gross = parseFloat((dist * priceKm).toFixed(2));
    const diff = pick(difficulties);
    const deadline = diff === 'Expert' ? 24 : diff === 'Difficile' ? 36 : 48;
    const trailer = pick(trailerKeys);
    const weight = randFloat(8, 28, 1);
    const now = new Date();
    const expires = new Date(now.getTime() + deadline * 3600 * 1000);

    rows.push({
      departure_city: depCity,
      departure_company: pick(COMPANIES),
      arrival_city: arrCity,
      arrival_company: pick(COMPANIES),
      cargo: pick(CARGOES),
      trailer_type: trailer,
      weight_tons: weight,
      distance_km: dist,
      price_per_km: priceKm,
      gross_revenue: gross,
      deadline_hours: deadline,
      difficulty: diff,
      status: 'disponible' as FreightStatus,
      created_by: userId,
      expires_at: expires.toISOString(),
    });
  }
  return rows;
}

const STATUS_TABS: { key: FreightStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'disponible', label: 'Disponible' },
  { key: 'reserve', label: 'Reservé' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'termine', label: 'Terminé' },
];

function timeUntilExpiry(expiresAt: string | null): string {
  if (!expiresAt) return '—';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expiré';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export function FreightMarketPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [freights, setFreights] = useState<Freight[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [tab, setTab] = useState<FreightStatus | 'all'>('disponible');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [takingId, setTakingId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const userLevel = profile ? (ROLE_LEVELS[profile.role] || 0) : 0;
  const canGenerate = userLevel >= 50;
  const canTake = userLevel >= 20;

  async function load() {
    setLoading(true);
    const [freightRes, driverRes, truckRes] = await Promise.all([
      supabase.from('freight_market').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('drivers').select('id, name, user_id, truck_id').eq('status', 'active'),
      supabase.from('trucks').select('id, model, registration').eq('status', 'active'),
    ]);
    if (freightRes.data) setFreights(freightRes.data);
    if (driverRes.data) setDrivers(driverRes.data);
    if (truckRes.data) setTrucks(truckRes.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function generate(count: number) {
    if (!profile) return;
    setGenerating(true);
    setError(null);
    const rows = generateFreightRow(profile.id, count);
    const { error: err } = await supabase.from('freight_market').insert(rows);
    if (err) setError(err.message);
    else { setSuccess(`${count} fret(s) générés avec succès`); setTimeout(() => setSuccess(null), 3000); }
    await load();
    setGenerating(false);
  }

  async function takeFreight(freight: Freight) {
    if (!profile || !selectedDriverId) { setError('Sélectionnez un chauffeur'); return; }
    setError(null);

    const driver = drivers.find(d => d.id === selectedDriverId);
    if (!driver) return;
    const truck = trucks.find(t => t.id === driver.truck_id);

    const today = new Date().toISOString().split('T')[0];

    const { data: rsData, error: rsErr } = await supabase.from('road_sheets').insert({
      driver_id: selectedDriverId,
      driver_user_id: driver.user_id,
      date: today,
      total_distance: freight.distance_km,
      total_fuel: 0,
      total_tolls: 0,
      cargo_type: freight.cargo,
      company: freight.departure_company,
      departure_city: freight.departure_city,
      arrival_city: freight.arrival_city,
      truck_id: driver.truck_id || null,
      price_per_km: freight.price_per_km,
      status: 'draft',
      freight_id: freight.id,
    }).select('id').single();

    if (rsErr || !rsData) { setError(rsErr?.message || 'Erreur création feuille de route'); return; }

    const { error: convoyErr } = await supabase.from('live_convoys').insert({
      road_sheet_id: rsData.id,
      freight_id: freight.id,
      driver_id: selectedDriverId,
      driver_user_id: driver.user_id,
      driver_name: driver.name,
      truck_id: driver.truck_id || null,
      truck_name: truck ? `${truck.model || ''} ${truck.registration}`.trim() : null,
      route_label: `${freight.departure_city} → ${freight.arrival_city}`,
      cargo: freight.cargo,
      distance_total: freight.distance_km,
      distance_done: 0,
      progress_percent: 0,
      status: 'en_route',
    });

    if (convoyErr) { setError(convoyErr.message); return; }

    const { error: fErr } = await supabase.from('freight_market').update({
      status: 'en_cours',
      assigned_driver_id: selectedDriverId,
      assigned_user_id: driver.user_id,
      road_sheet_id: rsData.id,
    }).eq('id', freight.id);

    if (fErr) { setError(fErr.message); return; }

    setTakingId(null);
    setSelectedDriverId('');
    setSuccess('Fret pris! Convoi créé et feuille de route ouverte.');
    setTimeout(() => setSuccess(null), 4000);
    await load();
    setTimeout(() => navigate('/road-sheets'), 1500);
  }

  const displayed = freights.filter(f => tab === 'all' || f.status === tab);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Bourse de fret</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {freights.filter(f => f.status === 'disponible').length} fret(s) disponible(s) en temps réel
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
              style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            {canGenerate && (
              <>
                <button onClick={() => generate(10)} disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}>
                  <Zap className="w-4 h-4" />
                  +10 frets
                </button>
                <button onClick={() => generate(50)} disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold btn-primary text-white transition-all">
                  <Zap className="w-4 h-4" />
                  +50 frets
                </button>
              </>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-emerald-400 text-sm"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.key
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
              style={tab === t.key ? {
                background: 'linear-gradient(135deg, rgba(229,9,20,0.2), rgba(229,9,20,0.08))',
                border: '1px solid rgba(229,9,20,0.35)',
              } : {
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
              {t.label}
              <span className="ml-2 text-xs opacity-60">
                {t.key === 'all' ? freights.length : freights.filter(f => f.status === t.key).length}
              </span>
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 rounded-2xl shimmer" style={{ background: 'rgba(255,255,255,0.03)' }} />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Package className="w-16 h-16 mb-4 opacity-10" />
            <p className="text-white/30 text-lg font-semibold">Aucun fret</p>
            <p className="text-white/20 text-sm mt-1">
              {canGenerate ? 'Utilisez les boutons ci-dessus pour générer des frets' : 'Revenez plus tard'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayed.map(freight => {
              const diff = DIFFICULTIES[freight.difficulty] || DIFFICULTIES['Moyen'];
              const [trailerColor] = TRAILERS[freight.trailer_type] || ['#6b7280', 'bg-gray-500/10 border-gray-500/30'];
              const isTaking = takingId === freight.id;
              const isDisponible = freight.status === 'disponible';

              return (
                <div key={freight.id} className="card-premium rounded-2xl overflow-hidden flex flex-col"
                  style={{ background: 'linear-gradient(135deg, rgba(22,22,22,0.98), rgba(13,13,13,0.98))' }}>

                  {/* Card header */}
                  <div className="p-4 pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#e50914' }} />
                          <span className="text-white font-bold text-sm truncate">{freight.departure_city}</span>
                          <ChevronRight className="w-3 h-3 text-white/30 flex-shrink-0" />
                          <span className="text-white font-bold text-sm truncate">{freight.arrival_city}</span>
                        </div>
                        <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {freight.departure_company} → {freight.arrival_company}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${diff.bg} ${diff.color}`}>
                        {diff.icon} {freight.difficulty}
                      </span>
                    </div>

                    {/* Cargo + trailer */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{ background: `${trailerColor}18`, border: `1px solid ${trailerColor}40`, color: trailerColor }}>
                        <Truck className="w-3 h-3" />
                        {freight.trailer_type}
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>
                        <Package className="w-3 h-3" />
                        {freight.cargo}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 divide-x p-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', divideColor: 'rgba(255,255,255,0.05)' }}>
                    {[
                      { label: 'Distance', value: `${freight.distance_km} km`, sub: `${freight.weight_tons}t` },
                      { label: 'Prix/km', value: `${freight.price_per_km.toFixed(2)}€`, sub: 'par km' },
                      { label: 'Gain', value: `${Math.round(freight.gross_revenue).toLocaleString('fr-FR')}€`, sub: 'brut', highlight: true },
                    ].map((stat, i) => (
                      <div key={i} className="px-3 py-2.5 text-center" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <p className={`text-sm font-black leading-tight ${stat.highlight ? 'text-emerald-400' : 'text-white'}`}>{stat.value}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">{stat.sub}</p>
                        <p className="text-[9px] uppercase tracking-wider text-white/20">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3 flex items-center justify-between gap-2 mt-auto">
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <Clock className="w-3 h-3" />
                      {timeUntilExpiry(freight.expires_at)}
                    </div>

                    {/* Status badge */}
                    {freight.status !== 'disponible' && (
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg ${
                        freight.status === 'en_cours' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                        freight.status === 'termine' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                        freight.status === 'reserve' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                        'bg-white/5 border-white/10 text-white/30'
                      } border`}>
                        {freight.status}
                      </span>
                    )}

                    {isDisponible && canTake && (
                      <button onClick={() => { setTakingId(freight.id); setSelectedDriverId(''); setError(null); }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold btn-primary text-white transition-all">
                        <Play className="w-3 h-3" />
                        Prendre ce fret
                      </button>
                    )}
                    {isDisponible && !canTake && (
                      <div className="flex items-center gap-1.5 text-xs text-white/25">
                        <Lock className="w-3 h-3" />
                        Accès requis
                      </div>
                    )}
                  </div>

                  {/* Take freight panel */}
                  {isTaking && (
                    <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: 'rgba(229,9,20,0.15)' }}>
                      <div className="mt-3 p-3 rounded-xl space-y-3"
                        style={{ background: 'rgba(229,9,20,0.05)', border: '1px solid rgba(229,9,20,0.15)' }}>
                        <p className="text-xs font-semibold text-white/70">Assigner un chauffeur</p>
                        <select
                          value={selectedDriverId}
                          onChange={e => setSelectedDriverId(e.target.value)}
                          className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
                          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <option value="">-- Choisir un chauffeur --</option>
                          {drivers.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button onClick={() => { setTakingId(null); setError(null); }}
                            className="flex-1 py-2 rounded-xl text-xs font-medium transition-all hover:bg-white/5"
                            style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                            Annuler
                          </button>
                          <button onClick={() => takeFreight(freight)} disabled={!selectedDriverId}
                            className="flex-1 py-2 rounded-xl text-xs font-bold btn-primary text-white transition-all disabled:opacity-40">
                            Confirmer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
