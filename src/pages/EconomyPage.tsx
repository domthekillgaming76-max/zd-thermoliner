import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Plus, X, Trash2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Layout } from '../components/Layout';
import { supabase, Transaction } from '../lib/supabase';

interface MonthData { month: string; income: number; expenses: number; profit: number }

const CATEGORIES = ['Route', 'Carburant', 'Péages', 'Salaires', 'Maintenance', 'Assurance', 'Autres'];

export function EconomyPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthData, setMonthData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: 'income' as 'income' | 'expense', amount: '', description: '', category: '', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
    const ch = supabase.channel('economy_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, loadData)
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, []);

  async function loadData() {
    try {
      const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false });
      const tx = (data ?? []) as Transaction[];
      setTransactions(tx);

      // Build monthly chart data (last 6 months)
      const months: MonthData[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        const mTx = tx.filter(t => t.date?.startsWith(key));
        const income = mTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const expenses = mTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
        months.push({ month: label, income, expenses, profit: income - expenses });
      }
      setMonthData(months);
    } catch (err) { console.error('[Z&D] Economy:', err); }
    finally { setLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) return;
    setSaving(true);
    try {
      await supabase.from('transactions').insert({
        type: form.type,
        amount: parseFloat(form.amount),
        description: form.description || null,
        category: form.category || null,
        date: form.date,
      });
      setShowModal(false);
      setForm({ type: 'income', amount: '', description: '', category: '', date: new Date().toISOString().split('T')[0] });
      loadData();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette transaction ?')) return;
    await supabase.from('transactions').delete().eq('id', id);
    loadData();
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIncome - totalExpenses;

  const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Économie</h1>
              <p className="text-white/30 text-sm">Revenus, dépenses et bénéfices</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm">
            <Plus className="w-4 h-4" />
            Transaction
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Revenus totaux', value: `+${fmt(totalIncome)} €`, icon: TrendingUp, color: 'emerald' },
            { label: 'Dépenses totales', value: `-${fmt(totalExpenses)} €`, icon: TrendingDown, color: 'red' },
            { label: 'Solde net', value: `${balance >= 0 ? '+' : ''}${fmt(balance)} €`, icon: DollarSign, color: balance >= 0 ? 'emerald' : 'red' },
          ].map(kpi => {
            const c = kpi.color === 'emerald' ? { text: 'text-emerald-400', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' }
              : { text: 'text-red-400', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' };
            return (
              <div key={kpi.label} className="card-premium p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                    <kpi.icon className={`w-4 h-4 ${c.text}`} />
                  </div>
                  <p className="text-white/40 text-sm">{kpi.label}</p>
                </div>
                {loading ? <div className="h-8 w-28 bg-white/5 rounded animate-pulse" /> : <p className={`text-2xl font-black ${c.text}`}>{kpi.value}</p>}
              </div>
            );
          })}
        </div>

        {/* Chart */}
        <div className="card-premium p-5">
          <h2 className="text-white font-bold mb-4">Évolution sur 6 mois</h2>
          {monthData.every(m => m.income === 0 && m.expenses === 0) ? (
            <div className="text-center py-12 text-white/20">Aucune donnée disponible</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.15)" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.15)" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#fff' }} />
                <Area type="monotone" dataKey="income" stroke="#34d399" strokeWidth={2} fill="url(#colorIncome)" name="Revenus" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#colorExpenses)" name="Dépenses" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Transactions list */}
        <div className="card-premium p-5">
          <h2 className="text-white font-bold mb-4">Toutes les transactions</h2>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/30">Aucune transaction — ajoutez la première</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      {tx.type === 'income' ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{tx.description || tx.category || (tx.type === 'income' ? 'Revenu' : 'Dépense')}</p>
                      <p className="text-white/30 text-xs">{tx.category && <span className="mr-2">{tx.category}</span>}{new Date(tx.date || tx.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{Number(tx.amount).toLocaleString('fr-FR')} €
                    </span>
                    <button onClick={() => handleDelete(tx.id)}
                      className="w-7 h-7 hover:bg-red-500/10 rounded-lg flex items-center justify-center transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-white/20 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border rounded-2xl w-full max-w-md" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <h2 className="font-bold text-white">Nouvelle transaction</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center">
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2">
                {(['income', 'expense'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setForm(p => ({ ...p, type: t }))}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${form.type === t
                      ? t === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-white/5 text-white/30 border border-white/5'}`}>
                    {t === 'income' ? 'Revenu' : 'Dépense'}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Montant (€) *</label>
                <input type="number" step="0.01" min="0.01" value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required
                  className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white focus:outline-none focus:border-red-500/50 text-sm"
                  style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Description</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Description de la transaction"
                  className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 text-sm"
                  style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Catégorie</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white focus:outline-none focus:border-red-500/50 text-sm"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <option value="">Aucune</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white/5 border rounded-xl text-white focus:outline-none focus:border-red-500/50 text-sm"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-white/5 rounded-xl text-white/50 text-sm">Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 btn-primary py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50">
                  {saving ? 'Enregistrement...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
