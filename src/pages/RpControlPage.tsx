import { useCallback, useEffect, useState } from 'react';
import { Shield, Radio, FileText, Users } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { supabase } from '../lib/supabase';

interface TachoTicketRow {
  id: string;
  driver_name: string;
  driver_number: string;
  mission_label: string | null;
  distance_km: number;
  driving_minutes: number;
  status: string;
  created_at: string;
  body_text: string;
}

export function RpControlPage() {
  const [tickets, setTickets] = useState<TachoTicketRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rp_tachograph_tickets')
      .select('id, driver_name, driver_number, mission_label, distance_km, driving_minutes, status, created_at, body_text')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error) setTickets((data ?? []) as TachoTicketRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <PageHeader
          icon={Shield}
          title="Contrôle routier RP"
          subtitle="Supervision des tickets tachygraphe — documents de simulation Z&D Thermoliner"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="admin-glass rounded-xl p-4 border border-white/5">
            <Users className="w-5 h-5 text-primary-400 mb-2" />
            <p className="text-2xl font-black text-white">{tickets.length}</p>
            <p className="text-xs text-white/40">Tickets archivés</p>
          </div>
          <div className="admin-glass rounded-xl p-4 border border-white/5">
            <Radio className="w-5 h-5 text-emerald-400 mb-2" />
            <p className="text-sm text-white/60">Chauffeurs connectés</p>
            <p className="text-xs text-white/30 mt-1">Via présence ERP / client Windows</p>
          </div>
          <div className="admin-glass rounded-xl p-4 border border-amber-500/20">
            <FileText className="w-5 h-5 text-amber-400 mb-2" />
            <p className="text-sm text-amber-200/80">Contrôle RP</p>
            <p className="text-xs text-white/30 mt-1">Demandez carte + dernier ticket au chauffeur</p>
          </div>
        </div>

        <section className="admin-glass rounded-2xl p-5 border border-white/5">
          <h3 className="text-sm font-bold text-white mb-4">Tickets tachygraphe récents</h3>
          {loading ? (
            <p className="text-sm text-white/40">Chargement…</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-white/40">Aucun ticket — les chauffeurs génèrent des tickets depuis le client Windows v1.0.2+.</p>
          ) : (
            <div className="space-y-3">
              {tickets.map(t => (
                <details key={t.id} className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
                  <summary className="cursor-pointer text-sm text-white font-medium list-none flex flex-wrap justify-between gap-2">
                    <span>{t.driver_name} · {t.driver_number}</span>
                    <span className="text-white/40 text-xs">{new Date(t.created_at).toLocaleString('fr-FR')}</span>
                  </summary>
                  <pre className="mt-3 text-[10px] text-emerald-300/80 font-mono whitespace-pre-wrap">{t.body_text}</pre>
                </details>
              ))}
            </div>
          )}
        </section>

        <p className="text-[10px] text-white/25">
          Simulation RP uniquement — aucune valeur légale. Centre de contrôle étendu (temps réel, convois) à venir.
        </p>
      </div>
    </Layout>
  );
}
