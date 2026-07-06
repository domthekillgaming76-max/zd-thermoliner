import { useEffect, useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, Plus, Calendar, PieChart, BarChart3, FileText, Check, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, BarChart, Bar } from 'recharts';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase, CompanyBudget, CompanyExpense, Driver } from '../lib/supabase';

const EXPENSE_CATEGORIES = ['Carburant', 'Maintenance', 'Peages', 'Assurances', 'Salaires', 'Achats', 'Administratif', 'Autre'];
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

export function CompanyBudgetPage() {
  const { profile, user } = useAuth();
  const [budget, setBudget] = useState<CompanyBudget[]>([]);
  const [expenses, setExpenses] = useState<CompanyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: '', description: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), opening_balance: '', income: '' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [budgetRes, expensesRes] = await Promise.all([
        supabase.from('company_budget').select('*').order('year', { ascending: false }).order('month', { ascending: false }),
        supabase.from('company_expenses').select('*').order('date', { ascending: false }),
      ]);

      if (budgetRes.data) setBudget(budgetRes.data);
      if (expensesRes.data) setExpenses(expensesRes.data);
    } catch (error) {
      console.error('Error loading budget:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    try {
      await supabase.from('company_expenses').insert({
        category: expenseForm.category,
        description: expenseForm.description || null,
        amount: parseFloat(expenseForm.amount),
        date: expenseForm.date,
        created_by: user!.id,
        status: 'pending',
      });
      setShowExpenseModal(false);
      setExpenseForm({ category: '', description: '', amount: '', date: new Date().toISOString().split('T')[0] });
      loadData();
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  }

  async function handleApproveExpense(id: string) {
    await supabase.from('company_expenses').update({ status: 'approved', approved_by: user!.id }).eq('id', id);
    loadData();
  }

  async function handleAddBudget(e: React.FormEvent) {
    e.preventDefault();
    try {
      const opening = parseFloat(budgetForm.opening_balance) || 0;
      const income = parseFloat(budgetForm.income) || 0;
      const monthExpenses = expenses
        .filter(ex => new Date(ex.date).getMonth() + 1 === budgetForm.month && new Date(ex.date).getFullYear() === budgetForm.year)
        .reduce((sum, ex) => sum + Number(ex.amount), 0);

      await supabase.from('company_budget').insert({
        month: budgetForm.month,
        year: budgetForm.year,
        opening_balance: opening,
        income: income,
        expenses: monthExpenses,
        closing_balance: opening + income - monthExpenses,
      });
      setShowBudgetModal(false);
      loadData();
    } catch (error) {
      console.error('Error adding budget:', error);
    }
  }

  // Calculate totals
  const totalIncome = budget.reduce((sum, b) => sum + Number(b.income), 0);
  const totalExpenses = budget.reduce((sum, b) => sum + Number(b.expenses), 0);
  const currentBalance = budget.length > 0 ? Number(budget[0].closing_balance) : 0;

  // Expenses by category
  const expensesByCategory = (() => {
    const cats: Record<string, number> = {};
    expenses.filter(e => e.status === 'approved').forEach(exp => {
      cats[exp.category] = (cats[exp.category] || 0) + Number(exp.amount);
    });
    return Object.entries(cats).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  })();

  // Monthly data
  const monthlyData = budget.slice(0, 6).reverse().map(b => ({
    month: new Date(b.year, b.month - 1).toLocaleDateString('fr-FR', { month: 'short' }),
    income: Number(b.income),
    expenses: Number(b.expenses),
  }));

  const pendingExpenses = expenses.filter(e => e.status === 'pending');

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Budget entreprise</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowExpenseModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium">
              <Plus className="w-5 h-5" />
              Depense
            </button>
            <button onClick={() => setShowBudgetModal(true)} className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg font-medium">
              <Calendar className="w-5 h-5" />
              Budget
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-dark-400">Solde actuel</p>
            </div>
            <p className={`text-3xl font-bold ${currentBalance >= 0 ? 'text-emerald-500' : 'text-primary-500'}`}>
              {currentBalance.toLocaleString('fr-FR')} EUR
            </p>
          </div>

          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-dark-400">Revenus total</p>
            </div>
            <p className="text-3xl font-bold text-emerald-500">
              +{totalIncome.toLocaleString('fr-FR')} EUR
            </p>
          </div>

          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-primary-500" />
              </div>
              <p className="text-dark-400">Depenses total</p>
            </div>
            <p className="text-3xl font-bold text-primary-500">
              -{totalExpenses.toLocaleString('fr-FR')} EUR
            </p>
          </div>

          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-dark-400">En attente</p>
            </div>
            <p className="text-3xl font-bold text-yellow-500">{pendingExpenses.length}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-500" />
              Evolution mensuelle
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} formatter={(v: number) => `${v.toLocaleString()} EUR`} />
                  <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={false} name="Revenus" />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} name="Depenses" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expenses by Category */}
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary-500" />
              Repartition des depenses
            </h3>
            <div className="h-64 flex items-center justify-center">
              {expensesByCategory.length === 0 ? (
                <p className="text-dark-500">Aucune depense</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie data={expensesByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                      {expensesByCategory.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} formatter={(v: number) => `${v.toLocaleString()} EUR`} />
                  </RechartsPie>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {expensesByCategory.map(cat => (
                <div key={cat.name} className="flex items-center gap-1 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-dark-400">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pending Expenses */}
        {pendingExpenses.length > 0 && profile?.role === 'admin' && (
          <div className="bg-dark-900 border border-yellow-500/30 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-dark-800 bg-yellow-500/10">
              <h3 className="text-lg font-semibold text-yellow-500 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Depenses en attente d'approbation
              </h3>
            </div>
            <div className="divide-y divide-dark-800">
              {pendingExpenses.map(exp => (
                <div key={exp.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{exp.description || exp.category}</p>
                    <p className="text-sm text-dark-500">{new Date(exp.date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-primary-500 font-semibold">{Number(exp.amount).toLocaleString()} EUR</span>
                    <button onClick={() => handleApproveExpense(exp.id)} className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg">
                      <Check className="w-4 h-4 text-emerald-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expenses List */}
        <div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-dark-800">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-500" />
              Historique des depenses
            </h3>
          </div>
          <div className="divide-y divide-dark-800">
            {loading ? (
              <div className="p-8 text-center text-dark-400">Chargement...</div>
            ) : expenses.length === 0 ? (
              <div className="p-8 text-center text-dark-500">Aucune depense</div>
            ) : (
              expenses.slice(0, 10).map(exp => (
                <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-dark-800/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${exp.status === 'approved' ? 'bg-emerald-500/20' : exp.status === 'pending' ? 'bg-yellow-500/20' : 'bg-dark-700'}`}>
                      <TrendingDown className={`w-5 h-5 ${exp.status === 'approved' ? 'text-emerald-500' : 'text-dark-500'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-white">{exp.description || exp.category}</p>
                      <p className="text-sm text-dark-500">{exp.category} - {new Date(exp.date).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary-500">-{Number(exp.amount).toLocaleString()} EUR</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${exp.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {exp.status === 'approved' ? 'Approuve' : 'En attente'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-800 rounded-2xl w-full max-w-md">
            <div className="p-4 border-b border-dark-800">
              <h2 className="text-lg font-semibold text-white">Nouvelle depense</h2>
            </div>
            <form onSubmit={handleAddExpense} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Categorie *</label>
                <select value={expenseForm.category} onChange={e => setExpenseForm(prev => ({ ...prev, category: e.target.value }))} required className="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white">
                  <option value="">Selectionner</option>
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Description</label>
                <input type="text" value={expenseForm.description} onChange={e => setExpenseForm(prev => ({ ...prev, description: e.target.value }))} className="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Montant *</label>
                  <input type="number" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))} required className="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Date *</label>
                  <input type="date" value={expenseForm.date} onChange={e => setExpenseForm(prev => ({ ...prev, date: e.target.value }))} required className="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="flex-1 px-4 py-2 bg-dark-800 text-white rounded-lg">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-800 rounded-2xl w-full max-w-md">
            <div className="p-4 border-b border-dark-800">
              <h2 className="text-lg font-semibold text-white">Nouveau budget mensuel</h2>
            </div>
            <form onSubmit={handleAddBudget} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Mois</label>
                  <select value={budgetForm.month} onChange={e => setBudgetForm(prev => ({ ...prev, month: parseInt(e.target.value) }))} className="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(2024, m - 1).toLocaleDateString('fr-FR', { month: 'long' })}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Annee</label>
                  <input type="number" value={budgetForm.year} onChange={e => setBudgetForm(prev => ({ ...prev, year: parseInt(e.target.value) }))} className="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Solde ouverture</label>
                  <input type="number" step="0.01" value={budgetForm.opening_balance} onChange={e => setBudgetForm(prev => ({ ...prev, opening_balance: e.target.value }))} className="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Revenus prevus</label>
                  <input type="number" step="0.01" value={budgetForm.income} onChange={e => setBudgetForm(prev => ({ ...prev, income: e.target.value }))} className="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowBudgetModal(false)} className="flex-1 px-4 py-2 bg-dark-800 text-white rounded-lg">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg">Creer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
