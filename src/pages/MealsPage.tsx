import { useMemo, useState } from 'react';
import { CreditCard, Loader2, Minus, Plus, ShoppingCart, Utensils } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';
import { MealReceiptCard } from '../components/meals/MealReceiptCard';
import { useAuth } from '../contexts/AuthContext';
import { useMealStore } from '../hooks/useMeals';
import { fmtEuro } from '../lib/format';
import type { MealCatalogItem } from '../lib/mealTypes';

export function MealsPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, purchase } = useMealStore(user?.id);
  const [restaurant, setRestaurant] = useState('Tous');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const restaurants = ['Tous', ...new Set((data?.catalog ?? []).map(item => item.restaurant))];
  const visible = (data?.catalog ?? []).filter(item => restaurant === 'Tous' || item.restaurant === restaurant);
  const cartItems = useMemo(() => Object.entries(cart).flatMap(([id, quantity]) => {
    const item = data?.catalog.find(row => row.id === id);
    return item ? [{ item, quantity }] : [];
  }), [cart, data?.catalog]);
  const total = cartItems.reduce((sum, row) => sum + row.item.price * row.quantity, 0);
  const activeRestaurant = cartItems[0]?.item.restaurant;

  function add(item: MealCatalogItem) {
    setLocalError(null);
    if (activeRestaurant && activeRestaurant !== item.restaurant) {
      setLocalError(`Terminez d'abord votre commande chez ${activeRestaurant}. Un ticket est créé par restaurant.`);
      return;
    }
    setCart(current => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 }));
  }

  function remove(id: string) {
    setCart(current => {
      const next = { ...current };
      if ((next[id] ?? 0) <= 1) delete next[id]; else next[id] -= 1;
      return next;
    });
  }

  async function checkout() {
    setLocalError(null);
    setMessage(null);
    const ids = cartItems.flatMap(row => Array.from({ length: row.quantity }, () => row.item.id));
    if (ids.length === 0) return;
    try {
      const order = await purchase.mutateAsync(ids);
      setCart({});
      setMessage(`Paiement accepté — ticket ${order.receipt_number} enregistré dans votre profil.`);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Paiement refusé.');
    }
  }

  return (
    <Layout>
      <div className="space-y-6 pb-10">
        <PageHeader title="Repas" subtitle="Restaurants, formules, boissons et paiement par carte chauffeur" icon={Utensils} />
        {localError && <FormAlert message={localError} onDismiss={() => setLocalError(null)} />}
        {message && <FormSuccess message={message} onDismiss={() => setMessage(null)} />}
        {isError && <FormAlert message={error instanceof Error ? error.message : 'Impossible de charger les restaurants.'} />}

        <div className="erp-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-rose-500/15">
          <div className="flex items-center gap-3"><CreditCard className="w-7 h-7 text-rose-400" /><div><p className="font-black text-white">Carte bancaire personnelle chauffeur</p><p className="text-xs text-white/35">{data?.account ? `${data.account.holder_name} · •••• ${data.account.account_number.slice(-4)}` : 'Compte bancaire chauffeur requis'}</p></div></div>
          <p className="text-2xl font-black text-white">{fmtEuro(data?.account?.balance ?? 0)}</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">{restaurants.map(name => <button key={name} type="button" onClick={() => setRestaurant(name)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${restaurant === name ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-white/5 text-white/40 border border-white/5'}`}>{name}</button>)}</div>

        {isLoading ? <div className="flex justify-center py-20"><Loader2 className="w-9 h-9 animate-spin text-rose-400" /></div> : <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{visible.map(item => <article key={item.id} className="erp-card rounded-2xl p-5 hover:border-rose-500/20 transition-colors"><div className="text-4xl">{item.emoji}</div><p className="text-[10px] uppercase tracking-wider text-rose-300/70 mt-3">{item.restaurant} · {item.category}</p><h2 className="text-base font-black text-white mt-1">{item.name}</h2><p className="text-xs text-white/35 mt-1 min-h-8">{item.description}</p><div className="flex items-center justify-between mt-4"><strong className="text-lg text-white">{fmtEuro(item.price)}</strong><button type="button" onClick={() => add(item)} className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-300 flex items-center justify-center hover:bg-rose-500/25" aria-label={`Ajouter ${item.name}`}><Plus className="w-5 h-5" /></button></div></article>)}</div>}

        <section className="erp-card rounded-2xl p-5 border border-rose-500/15 sticky bottom-3 z-20 bg-[#101010]/95 backdrop-blur-xl">
          <div className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-rose-400" /><h2 className="font-black text-white">Commande {activeRestaurant ? `· ${activeRestaurant}` : ''}</h2></div>
          {cartItems.length === 0 ? <p className="text-sm text-white/30 mt-3">Ajoutez un repas, une formule ou une boisson.</p> : <div className="mt-3 space-y-2">{cartItems.map(({ item, quantity }) => <div key={item.id} className="flex items-center justify-between gap-3 text-sm"><span className="text-white/65 flex-1">{quantity} × {item.name}</span><span className="text-white">{fmtEuro(item.price * quantity)}</span><button type="button" onClick={() => remove(item.id)} className="p-1.5 text-white/35 hover:text-red-400"><Minus className="w-4 h-4" /></button></div>)}</div>}
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="text-xs text-white/35">Total débité de votre compte chauffeur</p><p className="text-2xl font-black text-white">{fmtEuro(total)}</p></div><button type="button" disabled={cartItems.length === 0 || purchase.isPending || !data?.account || total > Number(data.account.balance)} onClick={checkout} className="btn-primary px-6 py-3 rounded-xl font-black disabled:opacity-40">{purchase.isPending ? 'Paiement…' : 'Payer par carte'}</button></div>
        </section>

        {(data?.orders.length ?? 0) > 0 && <section className="space-y-3"><h2 className="text-base font-black text-white">Mes derniers tickets</h2><div className="grid lg:grid-cols-2 gap-4">{data!.orders.slice(0, 4).map(order => <MealReceiptCard key={order.id} order={order} />)}</div></section>}
      </div>
    </Layout>
  );
}
