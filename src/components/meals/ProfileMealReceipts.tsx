import { Loader2, ReceiptText } from 'lucide-react';
import { useMealOrders } from '../../hooks/useMeals';
import { MealReceiptCard } from './MealReceiptCard';

export function ProfileMealReceipts({ profileId }: { profileId?: string }) {
  const { data = [], isLoading, isError } = useMealOrders(profileId);
  if (isLoading) return <div className="erp-card rounded-2xl p-10 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-rose-400" /></div>;
  if (isError) return <div className="erp-card rounded-2xl p-6 text-sm text-red-400">Impossible de charger les tickets repas.</div>;
  return (
    <section className="space-y-4">
      <div className="erp-card rounded-2xl p-5"><h2 className="flex items-center gap-2 text-base font-black text-white"><ReceiptText className="w-5 h-5 text-rose-400" />Mes tickets de restaurant</h2><p className="text-xs text-white/40 mt-1">Tous les achats réglés avec votre carte bancaire chauffeur.</p></div>
      {data.length === 0 ? <div className="erp-card rounded-2xl p-8 text-center text-sm text-white/35">Aucun ticket repas pour le moment.</div> : <div className="grid lg:grid-cols-2 gap-4">{data.map(order => <MealReceiptCard key={order.id} order={order} />)}</div>}
    </section>
  );
}
