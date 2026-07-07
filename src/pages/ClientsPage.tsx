import { useMemo, useState, useEffect } from 'react';
import { Plus, Search, Building2, Shield, FileText } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';
import { ClientsDashboard } from '../components/clients/ClientsDashboard';
import { ClientCard } from '../components/clients/ClientCard';
import { ClientFormModal } from '../components/clients/ClientFormModal';
import { InvoiceCard } from '../components/clients/InvoiceCard';
import { InvoiceDetailPanel, InvoiceCreateModal, ContractFormModal } from '../components/clients/InvoiceDetailPanel';
import {
  useCreateContract,
  useCreateErpClient,
  useCreateInvoice,
  useCreateInvoiceFromMission,
  useCreateInvoiceFromRoadSheet,
  useInvoicingModule,
  useMarkInvoicePaid,
  useUpdateErpClient,
  useUpdateInvoiceStatus,
} from '../hooks/useInvoicing';
import { useAuth } from '../contexts/AuthContext';
import { canManageClients } from '../lib/clientPermissions';
import {
  computeClientsDashboard,
  CONTRACT_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  resolveInvoiceStatus,
  type ErpClient,
  type Invoice,
  type InvoiceStatus,
} from '../lib/clientTypes';
import type { ClientFormInput } from '../services/invoicingService';
import { fetchErpClientById, fetchInvoiceById, fetchClientMissionsForDriver } from '../services/invoicingService';
import { fetchDriverLinkedIds } from '../services/dispatchService';

type TabId = 'dashboard' | 'clients' | 'contracts' | 'invoices';

export function ClientsPage() {
  const { profile, user } = useAuth();
  const isManager = canManageClients(profile?.role, user?.email);

  const [tab, setTab] = useState<TabId>('dashboard');
  const [search, setSearch] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | InvoiceStatus>('all');
  const [showClientForm, setShowClientForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);
  const [editingClient, setEditingClient] = useState<ErpClient | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedClient, setSelectedClient] = useState<ErpClient | null>(null);
  const [driverMissions, setDriverMissions] = useState<{ id: string; client_name: string | null; departure_city: string; arrival_city: string }[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useInvoicingModule();
  const createClient = useCreateErpClient();
  const updateClient = useUpdateErpClient();
  const createInvoice = useCreateInvoice();
  const createFromSheet = useCreateInvoiceFromRoadSheet();
  const createFromMission = useCreateInvoiceFromMission();
  const createContract = useCreateContract();
  const markPaid = useMarkInvoicePaid();
  const updateStatus = useUpdateInvoiceStatus();

  useEffect(() => {
    if (!user?.id || isManager) return;
    fetchDriverLinkedIds(user.id).then(async ids => {
      if (ids.length === 0) return;
      const missions = await Promise.all(ids.map(id => fetchClientMissionsForDriver(id)));
      setDriverMissions(missions.flat());
    });
  }, [user?.id, isManager]);

  const stats = useMemo(
    () => computeClientsDashboard(data?.clients ?? [], data?.invoices ?? [], data?.contracts ?? []),
    [data],
  );

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data?.clients ?? [];
    return (data?.clients ?? []).filter(c =>
      [c.name, c.contact_name, c.city, c.vat_number, c.siret].some(v => v?.toLowerCase().includes(q)),
    );
  }, [data?.clients, search]);

  const filteredInvoices = useMemo(() => {
    let list = data?.invoices ?? [];
    if (invoiceFilter !== 'all') list = list.filter(i => resolveInvoiceStatus(i) === invoiceFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(i => [i.invoice_number, i.client_name].some(v => v?.toLowerCase().includes(q)));
  }, [data?.invoices, search, invoiceFilter]);

  async function handleSaveClient(input: ClientFormInput) {
    if (!isManager) return;
    try {
      if (editingClient) {
        await updateClient.mutateAsync({ id: editingClient.id, input });
        setSuccessMessage('Client mis à jour.');
      } else {
        await createClient.mutateAsync(input);
        setSuccessMessage('Client créé.');
      }
      setShowClientForm(false);
      setEditingClient(null);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Erreur.');
    }
  }

  async function openInvoiceDetail(inv: Invoice) {
    const full = await fetchInvoiceById(inv.id);
    const client = full ? await fetchErpClientById(full.client_id) : null;
    setSelectedInvoice(full);
    setSelectedClient(client);
  }

  return (
    <Layout>
      <div className="space-y-6 client-module">
        <PageHeader
          title="Clients & Facturation"
          subtitle="CRM transport, contrats et facturation professionnelle"
          icon={Building2}
          actions={
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="erp-input pl-9 w-48" />
              </div>
              {isManager && (
                <>
                  <button type="button" onClick={() => { setEditingClient(null); setShowClientForm(true); }} className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold">
                    <Plus className="w-4 h-4" /> Client
                  </button>
                  <button type="button" onClick={() => setShowInvoiceForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white/70 hover:bg-white/10">
                    <FileText className="w-4 h-4" /> Facture
                  </button>
                </>
              )}
            </div>
          }
        />

        {!isManager && (
          <div className="client-glass rounded-xl p-3 flex items-center gap-2 text-xs text-white/45">
            <Shield className="w-4 h-4 text-red-400" /> Mode consultation — gestion réservée aux administrateurs et managers.
          </div>
        )}

        {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}
        {successMessage && <FormSuccess message={successMessage} onDismiss={() => setSuccessMessage(null)} />}
        {isError && <FormAlert message={error instanceof Error ? error.message : 'Erreur.'} />}

        {!isManager && driverMissions.length > 0 && (
          <div className="client-glass rounded-xl p-4">
            <h3 className="text-sm font-bold text-white mb-3">Vos missions clients</h3>
            <ul className="space-y-2">
              {driverMissions.map(m => (
                <li key={m.id} className="text-sm text-white/60 py-2 border-b border-white/5">
                  <span className="text-white font-medium">{m.client_name ?? 'Client'}</span> — {m.departure_city} → {m.arrival_city}
                </li>
              ))}
            </ul>
          </div>
        )}

        <nav className="flex gap-1 flex-wrap">
          {([
            { id: 'dashboard' as TabId, label: 'Tableau de bord' },
            { id: 'clients' as TabId, label: `Clients (${filteredClients.length})` },
            { id: 'contracts' as TabId, label: `Contrats (${data?.contracts.length ?? 0})` },
            { id: 'invoices' as TabId, label: `Factures (${filteredInvoices.length})` },
          ]).map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold ${tab === t.id ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'text-white/35 hover:bg-white/5'}`}>
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'dashboard' && <ClientsDashboard stats={stats} loading={isLoading} />}

        {tab === 'clients' && (
          isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="client-glass h-40 shimmer rounded-2xl" />)}</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map(c => (
                <ClientCard key={c.id} client={c} onEdit={isManager ? client => { setEditingClient(client); setShowClientForm(true); } : undefined} />
              ))}
            </div>
          )
        )}

        {tab === 'contracts' && (
          <div className="space-y-4">
            {isManager && (
              <button type="button" onClick={() => setShowContractForm(true)} className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" /> Nouveau contrat
              </button>
            )}
            <div className="grid md:grid-cols-2 gap-3">
              {(data?.contracts ?? []).map(c => (
                <div key={c.id} className="client-glass rounded-xl p-4 border border-white/5">
                  <p className="text-xs font-mono text-white/35">{c.contract_number}</p>
                  <p className="text-white font-bold">{c.client_name}</p>
                  <p className="text-xs text-white/40 mt-1">{new Date(c.start_date).toLocaleDateString('fr-FR')} → {new Date(c.end_date).toLocaleDateString('fr-FR')}</p>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className="text-white/50">{c.price_per_km} €/km · {c.cargo_type ?? '—'}</span>
                    <span className="text-red-400">{CONTRACT_STATUS_LABELS[c.status]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'invoices' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(['all', 'draft', 'sent', 'paid', 'late'] as const).map(f => (
                <button key={f} type="button" onClick={() => setInvoiceFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${invoiceFilter === f ? 'bg-white/10 text-white' : 'text-white/35'}`}>
                  {f === 'all' ? 'Toutes' : INVOICE_STATUS_LABELS[f].label}
                </button>
              ))}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInvoices.map(inv => (
                <InvoiceCard key={inv.id} invoice={inv} onSelect={openInvoiceDetail} />
              ))}
            </div>
          </div>
        )}

        {isManager && (
          <>
            <ClientFormModal open={showClientForm} editing={editingClient} saving={createClient.isPending || updateClient.isPending}
              onClose={() => { setShowClientForm(false); setEditingClient(null); }} onSubmit={handleSaveClient} />
            <InvoiceCreateModal open={showInvoiceForm} clients={data?.clients ?? []} billableSheets={data?.billableSheets ?? []}
              billableMissions={data?.billableMissions ?? []} saving={createInvoice.isPending || createFromSheet.isPending || createFromMission.isPending}
              onClose={() => setShowInvoiceForm(false)}
              onCreateManual={async input => {
                try {
                  await createInvoice.mutateAsync({ input: { ...input, lines: [{ description: input.description, quantity: 1, unit_price: input.amount }] }, createdBy: user?.id });
                  setSuccessMessage('Facture créée.');
                  setShowInvoiceForm(false);
                } catch (err) { setPageError(err instanceof Error ? err.message : 'Erreur.'); }
              }}
              onCreateFromSheet={async id => {
                try {
                  await createFromSheet.mutateAsync({ roadSheetId: id, createdBy: user?.id });
                  setSuccessMessage('Facture créée depuis feuille de route.');
                  setShowInvoiceForm(false);
                } catch (err) { setPageError(err instanceof Error ? err.message : 'Erreur.'); }
              }}
              onCreateFromMission={async id => {
                try {
                  await createFromMission.mutateAsync({ missionId: id, createdBy: user?.id });
                  setSuccessMessage('Facture créée depuis mission.');
                  setShowInvoiceForm(false);
                } catch (err) { setPageError(err instanceof Error ? err.message : 'Erreur.'); }
              }}
            />
            <ContractFormModal open={showContractForm} clients={data?.clients ?? []} saving={createContract.isPending}
              onClose={() => setShowContractForm(false)}
              onSubmit={async input => {
                try {
                  await createContract.mutateAsync(input);
                  setSuccessMessage('Contrat créé.');
                  setShowContractForm(false);
                } catch (err) { setPageError(err instanceof Error ? err.message : 'Erreur.'); }
              }}
            />
          </>
        )}

        {selectedInvoice && (
          <InvoiceDetailPanel
            invoice={selectedInvoice}
            client={selectedClient}
            canManage={isManager}
            paying={markPaid.isPending}
            onClose={() => { setSelectedInvoice(null); setSelectedClient(null); }}
            onMarkPaid={async () => {
              if (!user?.id) return;
              try {
                await markPaid.mutateAsync({ invoiceId: selectedInvoice.id, userId: user.id });
                setSuccessMessage('Facture payée — transaction bancaire créée.');
                setSelectedInvoice(null);
              } catch (err) { setPageError(err instanceof Error ? err.message : 'Erreur.'); }
            }}
            onMarkSent={async () => {
              try {
                await updateStatus.mutateAsync({ id: selectedInvoice.id, status: 'sent' });
                setSuccessMessage('Facture marquée comme envoyée.');
                const full = await fetchInvoiceById(selectedInvoice.id);
                setSelectedInvoice(full);
              } catch (err) { setPageError(err instanceof Error ? err.message : 'Erreur.'); }
            }}
          />
        )}
      </div>
    </Layout>
  );
}
