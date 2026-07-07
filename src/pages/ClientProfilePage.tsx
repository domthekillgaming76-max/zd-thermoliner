import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Building2, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useClientDetail } from '../hooks/useInvoicing';
import { CLIENT_STATUS_LABELS, INVOICE_STATUS_LABELS, resolveInvoiceStatus } from '../lib/clientTypes';
import { fmtEuro } from '../lib/format';

export function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useClientDetail(id);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-red-400" /></div>
      </Layout>
    );
  }

  if (isError || !data) {
    return (
      <Layout>
        <div className="client-glass rounded-2xl p-12 text-center">
          <p className="text-white/50">Client introuvable.</p>
          <button type="button" onClick={() => navigate('/clients')} className="mt-4 text-red-400 text-sm">← Retour</button>
        </div>
      </Layout>
    );
  }

  const { client, contracts, invoices } = data;
  const st = CLIENT_STATUS_LABELS[client.status];

  return (
    <Layout>
      <div className="space-y-6 client-module">
        <button type="button" onClick={() => navigate('/clients')} className="flex items-center gap-2 text-sm text-white/40 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Retour aux clients
        </button>

        <div className="client-glass rounded-2xl p-6 border border-white/10">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-700 to-red-950 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white/50" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black text-white">{client.name}</h1>
              {client.contact_name && <p className="text-white/40">{client.contact_name}</p>}
              <span className={`inline-block mt-2 text-xs px-2.5 py-0.5 rounded-full border font-semibold ${st.color}`}>{st.label}</span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-emerald-400">{fmtEuro(client.total_revenue)}</p>
              <p className="text-[10px] text-white/35">CA cumulé</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mt-6 text-sm">
            <Info icon={MapPin} label="Adresse" value={[client.address, client.postal_code, client.city, client.country].filter(Boolean).join(', ') || '—'} />
            <Info icon={Mail} label="Email" value={client.email ?? client.contact_email ?? '—'} />
            <Info icon={Phone} label="Téléphone" value={client.phone ?? client.contact_phone ?? '—'} />
            <Info icon={FileText} label="TVA / SIRET" value={[client.vat_number, client.siret].filter(Boolean).join(' · ') || '—'} />
            <Info icon={FileText} label="Délai paiement" value={`${client.payment_terms} jours`} />
            <Info icon={MapPin} label="Routes préférées" value={client.preferred_routes ?? '—'} />
            <Info icon={FileText} label="Fret préféré" value={client.preferred_cargo ?? '—'} />
          </div>
          {client.notes && <p className="mt-4 text-sm text-white/40 border-t border-white/5 pt-4">{client.notes}</p>}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <section>
            <h2 className="text-sm font-bold text-white mb-3">Contrats ({contracts.length})</h2>
            <div className="space-y-2">
              {contracts.length === 0 ? <p className="text-white/30 text-sm">Aucun contrat.</p> : contracts.map(c => (
                <div key={c.id} className="client-glass rounded-xl p-3 text-sm">
                  <p className="font-mono text-white/35 text-xs">{c.contract_number}</p>
                  <p className="text-white">{c.price_per_km} €/km · {c.cargo_type ?? '—'}</p>
                  <p className="text-white/40 text-xs">{new Date(c.end_date).toLocaleDateString('fr-FR')}</p>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-sm font-bold text-white mb-3">Factures ({invoices.length})</h2>
            <div className="space-y-2">
              {invoices.length === 0 ? <p className="text-white/30 text-sm">Aucune facture.</p> : invoices.slice(0, 6).map(inv => (
                <div key={inv.id} className="client-glass rounded-xl p-3 flex justify-between text-sm">
                  <div>
                    <p className="font-mono text-white/35 text-xs">{inv.invoice_number}</p>
                    <p className="text-white">{fmtEuro(inv.amount_ttc)}</p>
                  </div>
                  <span className={`text-[10px] self-center ${INVOICE_STATUS_LABELS[resolveInvoiceStatus(inv)].color.split(' ')[0]}`}>
                    {INVOICE_STATUS_LABELS[resolveInvoiceStatus(inv)].label}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <Icon className="w-4 h-4 text-red-400/70 shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] text-white/35 uppercase">{label}</p>
        <p className="text-white/80">{value}</p>
      </div>
    </div>
  );
}
