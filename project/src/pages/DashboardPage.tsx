import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Truck, Building2, Route, BarChart3, Banknote, TrendingUp, TrendingDown, MessageSquare } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Transaction } from '../lib/supabase';

const BANNER = 'https://images.pexels.com/photos/1427107/pexels-photo-1427107.jpeg?auto=compress&cs=tinysrgb&w=1920&q=80';

interface Stats { drivers: number; trucks: number; garages: number; roadSheets: number; income: number; expenses: number }

export function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({ drivers: 0, trucks: 0, garages: 0, roadSheets: 0, income: 0, expenses: 0 });
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    try {
      const [dRes, tRes, gRes, rRes, txRecent, txAll] = await Promise.all([
        supabase.from('drivers').select('id', { count: 'exact', head: true }),
        supabase.from('trucks').select('id', { count: 'exact', head: true }),
        supabase.from('garages').select('id', { count: 'exact', head: true }),
        supabase.from('road_sheets').select('id', { count: 'exact', head: true }),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('transactions').select('type, amount'),
      ]);
      const income = txAll.data?.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0) ?? 0;
      const expenses = txAll.data?.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) ?? 0;
      setStats({ drivers: dRes.count ?? 0, trucks: tRes.count ?? 0, garages: gRes.count ?? 0, roadSheets: rRes.count ?? 0, income, expenses });
      setRecentTx((txRecent.data ?? []) as Transaction[]);
    } catch (err) { console.error('[Z&D] Dashboard:', err); }
    finally { setLoading(false); }
  }

  const balance = stats.income - stats.expenses;
  const displayName = profile?.pseudo || profile?.full_name || 'Membre';

  return (
    <Layout>
      <div className="space-y-6">
        {/* Hero banner */}
        <div className="relative h-48 md:h-60 rounded-2xl overflow-hidden">
          <img src={BANNER} alt="Port" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(8,8,8,0.92) 0%, rgba(8,8,8,0.5) 55%, transparent 100%)' }} />
          <div className="absolute inset-0 flex flex-col justify-end p-6">
            <p className="text-white/50 text-sm mb-1">Bienvenue,</p>
            <h1 className="text-3xl font-black text-white leading-tight">{displayName}</h1>
            <p className="text-white/40 text-sm mt-1">Z&D Thermoliner — Gestion de flotte</p>
          </div>
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-400"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            En ligne
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([
            { label: 'Chauffeurs', value: stats.drivers, icon: Users, color: '#60a5fa', to: '/drivers' },
            { label: 'Camions', value: stats.trucks, icon: Truck, color: '#34d399', to: '/fleet' },
            { label: 'Garages', value: stats.garages, icon: Building2, color: '#f59e0b', to: '/garages' },
            { label: 'Feuilles route', value: stats.roadSheets, icon: Route, color: '#f87171', to: '/road-sheets' },
          ] as const).map(card => (
            <Link key={card.label} to={card.to} className="card-premium p-4 hover:scale-[1.02] transition-transform">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${card.color}15`, border: `1px solid ${card.color}25` }}>
                <card.icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
              <p className="text-white/40 text-xs mb-1">{card.label}</p>
              {loading ? <div className="h-7 w-10 bg-white/5 rounded animate-pulse" /> : <p className="text-2xl font-black text-white">{card.value}</p>}
            </Link>
          ))}
        </div>

        {/* Finance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Revenus', value: `+${stats.income.toLocaleString('fr-FR')} €`, icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'Dépenses', value: `-${stats.expenses.toLocaleString('fr-FR')} €`, icon: TrendingDown, color: 'text-red-400' },
            { label: 'Solde net', value: `${balance >= 0 ? '+' : ''}${balance.toLocaleString('fr-FR')} €`, icon: BarChart3, color: balance >= 0 ? 'text-emerald-400' : 'text-red-400' },
          ].map(f => (
            <div key={f.label} className="card-premium p-5">
              <div className="flex items-center gap-2 mb-3">
                <f.icon className={`w-4 h-4 ${f.color}`} />
                <p className="text-white/40 text-sm">{f.label}</p>
              </div>
              {loading ? <div className="h-8 w-28 bg-white/5 rounded animate-pulse" /> : <p className={`text-2xl font-black ${f.color}`}>{f.value}</p>}
            </div>
          ))}
        </div>

        {/* Quick links + Recent transactions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-premium p-5">
            <h2 className="text-white font-bold mb-4">Accès rapide</h2>
            <div className="grid grid-cols-2 gap-3">
              {([
                { to: '/road-sheets', icon: Route, label: 'Feuilles route', color: '#ef4444' },
                { to: '/fleet', icon: Truck, label: 'Flotte', color: '#60a5fa' },
                { to: '/economy', icon: BarChart3, label: 'Économie', color: '#34d399' },
                { to: '/wall', icon: MessageSquare, label: 'Mur société', color: '#f59e0b' },
              ] as const).map(l => (
                <Link key={l.to} to={l.to}
                  className="flex items-center gap-3 p-3 rounded-xl hover:scale-[1.02] transition-transform"
                  style={{ background: `${l.color}08`, border: `1px solid ${l.color}18` }}>
                  <l.icon className="w-4 h-4 flex-shrink-0" style={{ color: l.color }} />
                  <span className="text-sm font-medium text-white/70">{l.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="card-premium p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold">Transactions récentes</h2>
              <Link to="/bank" className="text-xs text-red-400 hover:text-red-300">Voir tout →</Link>
            </div>
            {recentTx.length === 0 ? (
              <div className="text-center py-8">
                <Banknote className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-white/30 text-sm">Aucune transaction</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTx.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <div>
                      <p className="text-sm text-white font-medium">{tx.description || tx.category || 'Transaction'}</p>
                      <p className="text-xs text-white/30">{new Date(tx.date || tx.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{Number(tx.amount).toLocaleString('fr-FR')} €
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
