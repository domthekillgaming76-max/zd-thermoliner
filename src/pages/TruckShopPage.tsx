import { useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, Loader2, PackageCheck, Search, ShoppingBag, Sparkles, Truck } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';
import { useAuth } from '../contexts/AuthContext';
import { useTruckShop } from '../hooks/useTruckShop';
import { fmtEuro } from '../lib/format';
import type { TruckEquipmentItem, TruckEquipmentLocation } from '../lib/truckShopTypes';

type LocationFilter = 'all' | TruckEquipmentLocation;

export function TruckShopPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, purchase } = useTruckShop(user?.id);
  const [location, setLocation] = useState<LocationFilter>('all');
  const [category, setCategory] = useState('Toutes');
  const [search, setSearch] = useState('');
  const [confirming, setConfirming] = useState<TruckEquipmentItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const categories = useMemo(() => ['Toutes', ...new Set((data?.catalog ?? []).map(item => item.category))], [data?.catalog]);
  const ownedCounts = useMemo(() => (data?.purchases ?? []).reduce<Record<string, number>>((acc, item) => {
    acc[item.item_id] = (acc[item.item_id] ?? 0) + 1;
    return acc;
  }, {}), [data?.purchases]);
  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('fr');
    return (data?.catalog ?? []).filter(item =>
      (location === 'all' || item.location === location) &&
      (category === 'Toutes' || item.category === category) &&
      (!needle || `${item.name} ${item.description ?? ''} ${item.category}`.toLocaleLowerCase('fr').includes(needle)),
    );
  }, [data?.catalog, location, category, search]);

  async function buy() {
    if (!confirming) return;
    setLocalError(null);
    setMessage(null);
    try {
      const result = await purchase.mutateAsync(confirming.id);
      setMessage(`${confirming.name} acheté — ${fmtEuro(result.price_paid)} débités de votre compte personnel.`);
      setConfirming(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Paiement refusé.');
    }
  }

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        <PageHeader title="Boutique camion" subtitle="Décoration et équipements intérieurs et extérieurs" icon={ShoppingBag} />
        {localError && <FormAlert message={localError} onDismiss={() => setLocalError(null)} />}
        {message && <FormSuccess message={message} onDismiss={() => setMessage(null)} />}
        {isError && <FormAlert message={error instanceof Error ? error.message : 'Impossible de charger la boutique.'} />}

        <section className="erp-card rounded-2xl p-5 border border-amber-500/15 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center"><CreditCard className="w-6 h-6 text-amber-300" /></div>
            <div><p className="font-black text-white">Compte personnel chauffeur</p><p className="text-xs text-white/40">{data?.account ? `${data.account.holder_name} · •••• ${data.account.account_number.slice(-4)}` : 'Compte bancaire actif requis'}</p></div>
          </div>
          <div className="lg:text-right"><p className="text-xs text-white/35">Solde disponible</p><p className="text-3xl font-black text-white">{fmtEuro(data?.account?.balance ?? 0)}</p></div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[.03] border border-white/5"><PackageCheck className="w-5 h-5 text-emerald-400" /><div><p className="text-xl font-black text-white">{data?.purchases.length ?? 0}</p><p className="text-[11px] text-white/35">équipements possédés</p></div></div>
        </section>

        <section className="erp-card rounded-2xl p-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un équipement…" className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-amber-500/40" /></div>
            <div className="flex gap-2">{([['all', 'Tout'], ['interior', 'Intérieur'], ['exterior', 'Extérieur']] as const).map(([key, label]) => <button key={key} type="button" onClick={() => { setLocation(key); setCategory('Toutes'); }} className={`px-4 py-2.5 rounded-xl text-xs font-bold border ${location === key ? 'bg-amber-500/20 text-amber-200 border-amber-500/30' : 'bg-white/5 text-white/45 border-white/5'}`}>{label}</button>)}</div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">{categories.map(name => <button key={name} type="button" onClick={() => setCategory(name)} className={`px-3 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap ${category === name ? 'bg-white/15 text-white' : 'bg-white/[.03] text-white/35'}`}>{name}</button>)}</div>
        </section>

        <div className="flex items-center justify-between"><p className="text-sm text-white/45"><strong className="text-white">{visible.length}</strong> articles disponibles</p><p className="hidden sm:flex items-center gap-1 text-xs text-white/30"><Sparkles className="w-3.5 h-3.5" /> Achat instantané et sécurisé</p></div>
        {isLoading ? <div className="flex justify-center py-20"><Loader2 className="w-9 h-9 animate-spin text-amber-400" /></div> : visible.length === 0 ? <div className="erp-card rounded-2xl p-12 text-center text-white/35">Aucun équipement ne correspond à ces filtres.</div> : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {visible.map(item => {
              const affordable = Boolean(data?.account) && item.price <= Number(data?.account?.balance ?? 0);
              const owned = ownedCounts[item.id] ?? 0;
              return <article key={item.id} className="erp-card rounded-2xl p-5 hover:border-amber-500/25 transition-all group flex flex-col">
                <div className="flex items-start justify-between"><div className="text-4xl group-hover:scale-110 transition-transform">{item.emoji}</div><span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${item.location === 'interior' ? 'bg-sky-500/10 text-sky-300' : 'bg-orange-500/10 text-orange-300'}`}>{item.location === 'interior' ? 'Intérieur' : 'Extérieur'}</span></div>
                <p className="text-[10px] uppercase tracking-wider text-amber-300/65 mt-4">{item.category}</p><h2 className="text-base font-black text-white mt-1">{item.name}</h2><p className="text-xs text-white/35 mt-1 min-h-10 flex-1">{item.description}</p>
                {owned > 0 && <p className="flex items-center gap-1.5 text-xs text-emerald-400 mt-3"><CheckCircle2 className="w-3.5 h-3.5" /> Possédé × {owned}</p>}
                <div className="flex items-end justify-between gap-3 mt-4"><div><p className="text-[10px] text-white/30">Prix TTC</p><strong className="text-xl text-white">{fmtEuro(item.price)}</strong></div><button type="button" disabled={!affordable || purchase.isPending || item.stock === 0} onClick={() => setConfirming(item)} className="px-4 py-2.5 rounded-xl bg-amber-500/15 text-amber-200 border border-amber-500/20 text-xs font-black hover:bg-amber-500/25 disabled:opacity-35">{item.stock === 0 ? 'Épuisé' : affordable ? 'Acheter' : 'Solde insuffisant'}</button></div>
              </article>;
            })}
          </div>
        )}

        {(data?.purchases.length ?? 0) > 0 && <section className="erp-card rounded-2xl p-5"><h2 className="font-black text-white flex items-center gap-2"><Truck className="w-5 h-5 text-amber-400" /> Mes derniers équipements</h2><div className="mt-4 grid md:grid-cols-2 xl:grid-cols-3 gap-2">{data!.purchases.slice(0, 9).map(row => <div key={row.id} className="rounded-xl bg-white/[.03] border border-white/5 p-3 flex justify-between gap-3"><div><p className="text-sm font-bold text-white">{row.item_name}</p><p className="text-[10px] text-white/30">{row.receipt_number} · {new Date(row.purchased_at).toLocaleDateString('fr-FR')}</p></div><p className="text-sm font-black text-amber-300">{fmtEuro(row.price_paid)}</p></div>)}</div></section>}
      </div>

      {confirming && <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={() => !purchase.isPending && setConfirming(null)}><div className="erp-card rounded-3xl p-6 max-w-md w-full border border-amber-500/25" onMouseDown={e => e.stopPropagation()}><div className="text-5xl">{confirming.emoji}</div><h2 className="text-xl font-black text-white mt-4">Confirmer l’achat</h2><p className="text-sm text-white/50 mt-2">Acheter <strong className="text-white">{confirming.name}</strong> ? Le montant sera débité immédiatement de votre compte personnel chauffeur.</p><div className="my-5 p-4 rounded-xl bg-white/5 flex justify-between"><span className="text-white/50">Montant débité</span><strong className="text-xl text-amber-300">{fmtEuro(confirming.price)}</strong></div><div className="flex gap-3"><button type="button" disabled={purchase.isPending} onClick={() => setConfirming(null)} className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-white/60 font-bold">Annuler</button><button type="button" disabled={purchase.isPending} onClick={buy} className="flex-1 btn-primary px-4 py-3 rounded-xl font-black">{purchase.isPending ? 'Paiement…' : 'Confirmer'}</button></div></div></div>}
    </Layout>
  );
}
