import { useState } from 'react';
import {
  LayoutDashboard, BarChart3, FileText, AlertTriangle, Euro, Link2,
  Circle, Star, MapPin, Phone, Mail, MessageCircle, Hash, Calendar,
  Briefcase, Gauge, Shield, ArrowUpCircle, Ban, FolderOpen,
} from 'lucide-react';
import {
  computeDriverStatistics,
  buildDriverTimeline,
  DRIVING_STATUS_LABELS,
  PRESENCE_STATUS_LABELS,
  INCIDENT_TYPE_LABELS,
  type DriverProfile,
  type DriverDocument,
  type DriverSalaryRecord,
  type DriverIncident,
  type DriverAssignmentRecord,
  type Trailer,
  type IncidentType,
} from '../../lib/driverTypes';
import { RoleBadge } from '../erp/RoleBadge';
import type { RoadSheet, Truck } from '../../lib/supabase';
import { fmtEuro } from '../../lib/format';
import { DEFAULT_TRUCK_BANNER_URL } from '../../lib/profileDefaults';
import { DriverAssignmentPanel, DriverDocumentsPanel } from './DriverProfilePanels';
import { DriverHrDossierPanel } from './DriverHrDossierPanel';
import { useUploadDriverDocument, useCreateIncident, useCreateSalaryRecord, useApproveDriverDocument, useSuspendDriver, usePromoteDriver, useRegenerateHrContract, useRegenerateHrCard } from '../../hooks/useDrivers';
import { describeDriverPromotion } from '../../services/driverService';
import { useAuth } from '../../contexts/AuthContext';
import { canManageDrivers, canManageDriverHr, canViewDriverHrDossier } from '../../lib/driverPermissions';
import type { DriverHrDossier } from '../../lib/driverHrTypes';

type ProfileTab = 'overview' | 'statistics' | 'documents' | 'incidents' | 'salary' | 'assignments' | 'hr_dossier';

const ALL_TABS: { id: ProfileTab; label: string; icon: typeof LayoutDashboard; hrOnly?: boolean }[] = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { id: 'statistics', label: 'Statistiques', icon: BarChart3 },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'hr_dossier', label: 'Dossier chauffeur', icon: FolderOpen, hrOnly: true },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'salary', label: 'Salaire', icon: Euro },
  { id: 'assignments', label: 'Affectations', icon: Link2 },
];

interface DriverProfileViewProps {
  driver: DriverProfile;
  roadSheets: RoadSheet[];
  documents: DriverDocument[];
  salaryHistory: DriverSalaryRecord[];
  incidents: DriverIncident[];
  assignments: DriverAssignmentRecord[];
  trucks: Truck[];
  trailers: Trailer[];
  garages?: { id: string; name: string; city: string | null }[];
  hrDossier?: DriverHrDossier;
}

export function DriverProfileView(props: DriverProfileViewProps) {
  const { driver, roadSheets, documents, salaryHistory, incidents, assignments, trucks, trailers, garages = [], hrDossier } = props;
  const [tab, setTab] = useState<ProfileTab>('overview');
  const { profile, user } = useAuth();
  const isAdmin = canManageDrivers(profile?.role, user?.email);
  const canViewHr = canViewDriverHrDossier(profile?.role, user?.email, user?.id, driver.user_id);
  const canManageHr = canManageDriverHr(profile?.role, user?.email);
  const tabs = ALL_TABS.filter(t => !t.hrOnly || canViewHr);
  const stats = computeDriverStatistics(driver, roadSheets, salaryHistory);
  const driving = DRIVING_STATUS_LABELS[driver.driving_status] ?? DRIVING_STATUS_LABELS.resting;
  const presence = PRESENCE_STATUS_LABELS[driver.presence_status] ?? PRESENCE_STATUS_LABELS.offline;
  const timeline = buildDriverTimeline(roadSheets, salaryHistory, incidents, assignments);
  const uploadDoc = useUploadDriverDocument(driver.id);
  const approveDoc = useApproveDriverDocument(driver.id);
  const createIncident = useCreateIncident(driver.id);
  const createSalary = useCreateSalaryRecord(driver.id);
  const suspendMutation = useSuspendDriver(driver.id);
  const promoteMutation = usePromoteDriver(driver.id);
  const regenerateContract = useRegenerateHrContract(driver.id);
  const regenerateCard = useRegenerateHrCard(driver.id);

  const banner = driver.banner_url || DEFAULT_TRUCK_BANNER_URL;
  const photo = driver.photo_url || driver.avatar_url;

  return (
    <div className="space-y-6 driver-module">
      {/* Hero banner */}
      <div className="driver-glass rounded-2xl overflow-hidden border border-white/10">
        <div
          className="h-44 sm:h-52 relative"
          style={{
            background: banner.startsWith('data:') || banner.startsWith('http')
              ? `url(${banner}) center/cover`
              : banner,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/60 to-transparent" />
          {driver.fleet_name && (
            <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-400">
              {driver.fleet_name}
            </span>
          )}
        </div>
        <div className="px-6 pb-6 -mt-14 relative flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-[#080808] shadow-2xl flex-shrink-0 flex items-center justify-center text-3xl font-black text-white driver-avatar-glow"
            style={{ background: 'linear-gradient(135deg, #ef4444, #991b1b)' }}>
            {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : driver.name[0]}
          </div>
          <div className="flex-1 pt-2 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-white">{driver.name}</h1>
            {driver.pseudo && <p className="text-white/40">@{driver.pseudo}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              <RoleBadge role={driver.member_role} size="sm" />
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${driving.color}`}>{driving.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1.5 bg-white/5 border border-white/10 ${presence.color}`}>
                <Circle className={`w-2 h-2 fill-current ${presence.dot}`} />
                {presence.label}
              </span>
              {driver.is_suspended && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Suspendu</span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/50 flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400" /> {stats.driverRating}/5
              </span>
            </div>
          </div>
          <div className="text-xs text-white/45 space-y-1 sm:text-right">
            {driver.employee_number && <p>N° {driver.employee_number}</p>}
            {driver.phone && <p className="flex items-center gap-1 sm:justify-end"><Phone className="w-3 h-3" />{driver.phone}</p>}
            {driver.email && <p className="flex items-center gap-1 sm:justify-end"><Mail className="w-3 h-3" />{driver.email}</p>}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="driver-glass rounded-xl p-3 flex flex-wrap gap-2 items-center border border-red-500/15">
          <Shield className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-xs text-white/50 mr-auto">Actions administrateur</span>
          <button
            type="button"
            disabled={promoteMutation.isPending}
            onClick={() => promoteMutation.mutate()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 disabled:opacity-50"
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            Promouvoir → {describeDriverPromotion(driver.member_role)}
          </button>
          <button
            type="button"
            disabled={suspendMutation.isPending}
            onClick={() => suspendMutation.mutate(!driver.is_suspended)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-50 ${
              driver.is_suspended
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            {driver.is_suspended ? 'Réactiver' : 'Suspendre'}
          </button>
        </div>
      )}

      {/* Animated stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'KM total', value: stats.totalKm.toLocaleString('fr-FR'), icon: Gauge },
          { label: 'Livraisons', value: String(stats.deliveries), icon: Briefcase },
          { label: 'Revenus', value: fmtEuro(stats.revenueGenerated), icon: Euro },
          { label: 'Note', value: `${stats.driverRating}/5`, icon: Star },
          { label: 'Carburant', value: `${stats.fuelAverage.toFixed(2)} €/km`, icon: Gauge },
          { label: 'Rentabilité', value: fmtEuro(stats.netProfitability), icon: BarChart3 },
        ].map((s, i) => (
          <div key={s.label} className="driver-stat-card rounded-xl p-3 text-center" style={{ animationDelay: `${i * 60}ms` }}>
            <s.icon className="w-4 h-4 mx-auto mb-1 text-red-400" />
            <p className="text-sm font-black text-white">{s.value}</p>
            <p className="text-[10px] text-white/35 uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <nav className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              tab === t.id
                ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                : 'text-white/35 hover:bg-white/5 border border-transparent'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="driver-glass rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Informations personnelles</h3>
            <InfoRow icon={Calendar} label="Naissance" value={driver.date_of_birth ? new Date(driver.date_of_birth).toLocaleDateString('fr-FR') : '—'} />
            <InfoRow icon={MapPin} label="Adresse" value={[driver.address, driver.postal_code, driver.city, driver.country].filter(Boolean).join(', ') || '—'} />
            <InfoRow icon={MessageCircle} label="Discord" value={driver.discord_name ?? '—'} />
            <InfoRow icon={Hash} label="TruckersMP" value={driver.truckersmp_id ?? '—'} />
            <InfoRow icon={Hash} label="Steam" value={driver.steam_id ?? '—'} />
          </div>
          <div className="driver-glass rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Informations professionnelles</h3>
            <InfoRow icon={Briefcase} label="Contrat" value={driver.employment_contract ?? 'CDI'} />
            <InfoRow icon={Calendar} label="Embauche" value={driver.hiring_date ? new Date(driver.hiring_date).toLocaleDateString('fr-FR') : '—'} />
            <InfoRow icon={FileText} label="Permis" value={`${driver.license_categories ?? 'C,CE'} — ${driver.license_number ?? 'N/A'}`} />
            <InfoRow icon={Calendar} label="Expiration permis" value={driver.license_expires_at ? new Date(driver.license_expires_at).toLocaleDateString('fr-FR') : '—'} />
            <InfoRow icon={Gauge} label="Éco-conduite" value={`${driver.eco_driving_score}/100`} />
            <InfoRow icon={Gauge} label="Niveau expérience" value={`Niv. ${driver.driver_level} — ${driver.experience_years} ans`} />
            <InfoRow icon={Gauge} label="Heures conduite / repos" value={`${driver.driving_hours_month}h / ${driver.rest_hours_month}h`} />
            <InfoRow icon={Shield} label="ADR" value={driver.has_adr ? 'Certifié' : 'Non certifié'} />
          </div>
          <div className="driver-glass rounded-2xl p-5 xl:col-span-2">
            <h3 className="text-sm font-bold text-white mb-4">Timeline</h3>
            <ul className="space-y-3 max-h-72 overflow-y-auto">
              {timeline.slice(0, 15).map(ev => (
                <li key={ev.id} className="flex gap-3 text-sm driver-timeline-item">
                  <span className="text-white/30 text-xs w-16 flex-shrink-0">
                    {new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                  <div>
                    <p className="text-white font-medium">{ev.title}</p>
                    {ev.description && <p className="text-white/35 text-xs">{ev.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === 'statistics' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: 'KM total', value: stats.totalKm.toLocaleString('fr-FR') },
            { label: 'KM mois', value: stats.monthlyKm.toLocaleString('fr-FR') },
            { label: 'Revenus générés', value: fmtEuro(stats.revenueGenerated) },
            { label: 'Carburant consommé', value: fmtEuro(stats.fuelConsumed) },
            { label: 'Conso moyenne', value: `${stats.fuelAverage.toFixed(2)} €/km` },
            { label: 'Profit moyen', value: fmtEuro(stats.averageProfit) },
            { label: 'Salaire moyen', value: fmtEuro(stats.averageSalary) },
            { label: 'Temps moyen livraison', value: `${stats.averageDeliveryTimeHours}h` },
            { label: 'Livraisons acceptées', value: String(stats.acceptedDeliveries) },
            { label: 'Annulées', value: String(stats.cancelledDeliveries) },
            { label: 'Rejetées', value: String(stats.rejectedDeliveries) },
            { label: 'Note chauffeur', value: `${stats.driverRating}/5` },
          ].map((s, i) => (
            <div key={s.label} className="driver-stat-card rounded-xl p-4" style={{ animationDelay: `${i * 40}ms` }}>
              <p className="text-[10px] text-white/35 uppercase">{s.label}</p>
              <p className="text-lg font-black text-white mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'documents' && (
        <DriverDocumentsPanel
          driverId={driver.id}
          documents={documents}
          uploading={uploadDoc.isPending}
          approving={approveDoc.isPending}
          isAdmin={isAdmin}
          onUpload={(file, docType, expiresAt) => uploadDoc.mutate({ file, docType, expiresAt })}
          onApprove={documentId => user && approveDoc.mutate({ documentId, approverId: user.id })}
        />
      )}

      {tab === 'hr_dossier' && canViewHr && hrDossier && (
        <DriverHrDossierPanel
          driver={driver}
          dossier={hrDossier}
          canManage={canManageHr}
          onRegenerateContract={() => regenerateContract.mutate(driver)}
          onRegenerateCard={() => regenerateCard.mutate(driver)}
          regenerating={regenerateContract.isPending || regenerateCard.isPending}
        />
      )}

      {tab === 'incidents' && (
        <IncidentsTab
          incidents={incidents}
          isAdmin={isAdmin}
          loading={createIncident.isPending}
          onCreate={input => createIncident.mutate(input)}
        />
      )}

      {tab === 'salary' && (
        <SalaryTab
          records={salaryHistory}
          isAdmin={isAdmin}
          loading={createSalary.isPending}
          onCreate={input => createSalary.mutate(input)}
        />
      )}

      {tab === 'assignments' && (
        <div className="space-y-4">
          <DriverAssignmentPanel
            driverId={driver.id}
            truckId={driver.truck_id}
            trailerId={driver.trailer_id}
            garageId={driver.garage_id}
            fleetName={driver.fleet_name}
            garageName={driver.garage_name}
            trucks={trucks}
            trailers={trailers}
            garages={garages}
            readOnly={!isAdmin}
          />
          <div className="driver-glass rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">Historique des affectations</h3>
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {assignments.map(a => (
                <li key={a.id} className="flex justify-between text-sm py-2 border-b border-white/5">
                  <span className="text-white/70">{a.asset_label ?? a.asset_type}</span>
                  <span className="text-white/30 text-xs">{new Date(a.assigned_at).toLocaleDateString('fr-FR')}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="w-4 h-4 text-red-400/70 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-[10px] text-white/35 uppercase">{label}</p>
        <p className="text-white/80">{value}</p>
      </div>
    </div>
  );
}

function IncidentsTab({
  incidents,
  isAdmin,
  loading,
  onCreate,
}: {
  incidents: DriverIncident[];
  isAdmin: boolean;
  loading: boolean;
  onCreate: (input: { incident_type: IncidentType; title: string; description?: string }) => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<IncidentType>('manager_note');
  const [desc, setDesc] = useState('');

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="driver-glass rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">Enregistrer un incident</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <select value={type} onChange={e => setType(e.target.value as IncidentType)} className="erp-select w-full text-sm">
              {(Object.keys(INCIDENT_TYPE_LABELS) as IncidentType[]).map(k => (
                <option key={k} value={k}>{INCIDENT_TYPE_LABELS[k]}</option>
              ))}
            </select>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre" className="erp-input w-full text-sm" />
          </div>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" className="erp-input w-full text-sm min-h-[60px]" />
          <button
            type="button"
            disabled={!title.trim() || loading}
            onClick={() => { onCreate({ incident_type: type, title, description: desc }); setTitle(''); setDesc(''); }}
            className="btn-primary px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
          >
            Enregistrer
          </button>
        </div>
      )}
      <div className="driver-glass rounded-2xl p-5">
        <ul className="space-y-3">
          {incidents.length === 0 ? (
            <p className="text-white/30 text-sm">Aucun incident enregistré.</p>
          ) : incidents.map(i => (
            <li key={i.id} className="rounded-xl p-3 border border-white/5 bg-white/[0.02]">
              <div className="flex justify-between gap-2">
                <span className="text-xs text-red-400 font-semibold">{INCIDENT_TYPE_LABELS[i.incident_type ?? 'note']}</span>
                <span className="text-[10px] text-white/30">{new Date(i.incident_date).toLocaleDateString('fr-FR')}</span>
              </div>
              <p className="text-sm text-white font-medium mt-1">{i.title}</p>
              {i.description && <p className="text-xs text-white/40 mt-0.5">{i.description}</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SalaryTab({
  records,
  isAdmin,
  loading,
  onCreate,
}: {
  records: DriverSalaryRecord[];
  isAdmin: boolean;
  loading: boolean;
  onCreate: (input: { bonus?: number; penalty?: number; notes?: string }) => void;
}) {
  const [bonus, setBonus] = useState('');
  const [penalty, setPenalty] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="driver-glass rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">Ajouter prime / pénalité</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="number" value={bonus} onChange={e => setBonus(e.target.value)} placeholder="Prime €" className="erp-input w-full text-sm" />
            <input type="number" value={penalty} onChange={e => setPenalty(e.target.value)} placeholder="Pénalité €" className="erp-input w-full text-sm" />
          </div>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" className="erp-input w-full text-sm" />
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              onCreate({
                bonus: Number(bonus) || 0,
                penalty: Number(penalty) || 0,
                notes,
              });
              setBonus(''); setPenalty(''); setNotes('');
            }}
            className="btn-primary px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
          >
            Enregistrer
          </button>
        </div>
      )}
      <div className="driver-glass rounded-2xl p-5">
        <ul className="space-y-2">
          {records.length === 0 ? (
            <p className="text-white/30 text-sm">Historique vide — alimenté après validation des feuilles.</p>
          ) : records.map(r => (
            <li key={r.id} className="flex justify-between items-center text-sm py-2 border-b border-white/5">
              <div>
                <p className="text-white/70">{r.notes ?? `${r.period_month}/${r.period_year}`}</p>
                <p className="text-[10px] text-white/30">
                  {r.payment_status === 'paid' ? 'Payé' : 'En attente'}
                  {r.payment_date && ` — ${new Date(r.payment_date).toLocaleDateString('fr-FR')}`}
                </p>
              </div>
              <span className={`font-bold ${r.net_amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtEuro(r.net_amount)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
