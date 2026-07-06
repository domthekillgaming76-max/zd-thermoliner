import { useEffect, useState } from 'react';
import { Banknote, TrendingUp, TrendingDown, Plus, X, Trash2, Download } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase, Transaction } from '../lib/supabase';

const CATEGORIES = ['Route', 'Carburant', 'Péages', 'Salaires', 'Maintenance', 'Assurance', 'Prime', 'Autres'];
const EMPTY_FORM = { type: 'income' as 'income' | 'expense', amount: '', description: '', category: '', date: new Date().toISOString().split('T')[0] };

export function BankPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  useEffect(() => {
    loadTransactions();
    const ch = supabase.channel('bank_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, loadTransactions)
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, []);

  async function loadTransactions() {
    try {
      const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false });
      setTransactions((data ?? []) as Transaction[]);
    } catch (err) { console.error('[Z&D] Bank:', err); }
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
      setForm(EMPTY_FORM);
      loadTransactions();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette transaction ?')) return;
    await supabase.from('transactions').delete().eq('id', id);
    loadTransactions();
  }

  function exportCSV() {
    const rows = [['Date', 'Type', 'Montant', 'Description', 'Catégorie'],
      ...transactions.map(t => [t.date, t.type === 'income' ? 'Revenu' : 'Dépense', t.amount, t.description ?? '', t.category ?? ''])];
    const csv = rows.map(r => r.join(';')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'transactions.csv';
    a.click();
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIncome - totalExpenses;
  const filtered = filterType === 'all' ? transactions : transactions.filter(t => t.type === filterType);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center">
              <Banknote className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Banque RP</h1>
              <p className="text-white/30 text-sm">Suivi financier Z&D Thermoliner</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white/50 text-sm hover:bg-white/5 transition-colors border"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <Download className="w-4 h-4" />
              Export
            </button>
            <button onClick={() => setShowModal(true)}
              className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm">
              <Plus className="w-4 h-4" />
              Transaction
            </button>
          </div>
        </div>

        {/* Balance card */}
        <div className="rounded-2xl p-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1a0505 0%, #0d0d0d 100%)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(239,68,68,0.08) 0%, transparent 60%)' }} />
          <div className="relative">
            <p className="text-white/40 text-sm mb-2">Solde net Z&D Thermoliner</p>
            <p className={`text-4xl font-black ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {balance >= 0 ? '+' : ''}{balance.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
            </p>
            <div className="flex gap-6 mt-4">
              <div>
                <p className="text-white/30 text-xs">Revenus</p>
                <p className="text-emerald-400 font-bold">+{totalIncome.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</p>
              </div>
              <div>
                <p className="text-white/30 text-xs">Dépenses</p>
                <p className="text-red-400 font-bold">-{totalExpenses.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</p>
              </div>
              <div>
                <p className="text-white/30 text-xs">Transactions</p>
                <p className="text-white font-bold">{transactions.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all', 'income', 'expense'] as const).map(f => (
            <button key={f} onClick={() => setFilterType(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filterType === f ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}>
              {f === 'all' ? 'Tout' : f === 'income' ? 'Revenus' : 'Dépenses'}
            </button>
          ))}
        </div>

        {/* Transactions */}
        <div className="card-premium overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-white/20">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <Banknote className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/30">Aucune transaction</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {filtered.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      {tx.type === 'income' ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{tx.description || tx.category || (tx.type === 'income' ? 'Revenu' : 'Dépense')}</p>
                      <p className="text-white/25 text-xs">
                        {tx.category && <span className="mr-2 text-white/40">{tx.category}</span>}
                        {new Date(tx.date || tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{Number(tx.amount).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
                    </span>
                    <button onClick={() => handleDelete(tx.id)}
                      className="w-7 h-7 hover:bg-red-500/10 rounded-lg flex items-center justify-center transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-white/15 hover:text-red-400" />
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
                  placeholder="Description"
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
