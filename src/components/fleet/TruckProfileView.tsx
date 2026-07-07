import { useState } from 'react';
import {
  Truck, Wrench, Euro, Link2, AlertTriangle, User, Building2,
  Calendar, Gauge, Shield, CheckCircle2, Loader2, FileText,
} from 'lucide-react';
import { fmtEuro } from '../../lib/format';
import { DEFAULT_TRUCK_BANNER_URL } from '../../lib/profileDefaults';
import {
  TRUCK_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_STATUS_LABELS,
  computeTruckCosts,
  getMaintenanceAlerts,
  type FleetTruck,
  type FleetMaintenance,
  type TruckCosts,
  type TruckAssignment,
  type TruckDocument,
  type TruckDocType,
  type MaintenanceType,
} from '../../lib/fleetTypes';
import type { Garage } from '../../lib/supabase';
import type { Trailer } from '../../lib/driverTypes';
import {
  useAssignTruckFleet,
  useCreateFleetMaintenance,
  useValidateFleetMaintenance,
  useUploadTruckDocument,
} from '../../hooks/useFleet';
import { useAuth } from '../../contexts/AuthContext';
import { canManageFleet } from '../../lib/fleetPermissions';

type Tab = 'overview' | 'maintenance' | 'costs' | 'assignments' | 'documents';

interface TruckProfileViewProps {
  truck: FleetTruck;
  costs: TruckCosts | null;
  maintenance: FleetMaintenance[];
  assignments: TruckAssignment[];
  documents: TruckDocument[];
  garages: Garage[];
  trailers: Trailer[];
  drivers: { id: string; name: string; pseudo: string | null }[];
}

export function TruckProfileView(props: TruckProfileViewProps) {
  const { truck, costs, maintenance, assignments, documents, garages, trailers, drivers } = props;
  const [tab, setTab] = useState<Tab>('overview');
  const { profile, user } = useAuth();
  const isAdmin = canManageFleet(profile?.role, user?.email);
  const costBreakdown = computeTruckCosts(costs, maintenance, truck.mileage);
  const alerts = getMaintenanceAlerts([truck], maintenance);
  const assignMutation = useAssignTruckFleet();
  const createMaint = useCreateFleetMaintenance(truck.id);
  const validateMaint = useValidateFleetMaintenance(truck.id);
  const uploadDoc = useUploadTruckDocument(truck.id);

  const st = TRUCK_STATUS_LABELS[truck.status];
  const banner = truck.photo_url || DEFAULT_TRUCK_BANNER_URL;

  const tabs: { id: Tab; label: string; icon: typeof Truck }[] = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: Truck },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'costs', label: 'Coûts', icon: Euro },
    { id: 'assignments', label: 'Affectations', icon: Link2 },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  return (
    <div className="space-y-6 fleet-module">
      <div className="fleet-glass rounded-2xl overflow-hidden border border-white/10">
        <div className="h-44 sm:h-52 relative" style={{ background: `url(${banner}) center/cover` }}>
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-black/50 to-transparent" />
          <span className={`absolute top-4 left-4 text-xs px-2.5 py-1 rounded-full border font-semibold ${st.color}`}>{st.label}</span>
        </div>
        <div className="px-6 pb-6 -mt-12 relative flex flex-col sm:flex-row gap-4">
          <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-[#080808] fleet-avatar-glow flex items-center justify-center bg-gradient-to-br from-red-700 to-red-950">
            {truck.photo_url ? <img src={truck.photo_url} alt="" className="w-full h-full object-cover" /> : <Truck className="w-10 h-10 text-white/30" />}
          </div>
          <div className="flex-1 pt-2">
            <h1 className="text-2xl font-black text-white">{[truck.brand, truck.model].filter(Boolean).join(' ') || truck.registration}</h1>
            <p className="text-white/40 font-mono text-sm">{truck.registration}{truck.vin ? ` · ${truck.vin}` : ''}</p>
            <div className="flex flex-wrap gap-3 text-xs text-white/45 mt-2">
              {truck.year && <span>{truck.year}</span>}
              <span>{truck.mileage.toLocaleString('fr-FR')} km</span>
              {truck.fuel_consumption > 0 && <span>{truck.fuel_consumption} L/100km</span>}
            </div>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`fleet-glass rounded-xl p-3 flex items-center gap-2 border ${a.urgency === 'high' ? 'border-red-500/30' : 'border-amber-500/20'}`}>
              <AlertTriangle className={`w-4 h-4 shrink-0 ${a.urgency === 'high' ? 'text-red-400' : 'text-amber-400'}`} />
              <p className="text-sm text-white/70">{a.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Coût/km', value: `${costBreakdown.costPerKm} €`, icon: Gauge },
          { label: 'Rentabilité', value: fmtEuro(costBreakdown.profitability), icon: Euro },
          { label: 'Revenus', value: fmtEuro(costBreakdown.revenue), icon: Euro },
          { label: 'Maintenance', value: String(maintenance.filter(m => m.status !== 'completed').length), icon: Wrench },
        ].map((s, i) => (
          <div key={s.label} className="fleet-stat-card rounded-xl p-3 text-center" style={{ animationDelay: `${i * 40}ms` }}>
            <s.icon className="w-4 h-4 mx-auto mb-1 text-red-400" />
            <p className="text-sm font-black text-white">{s.value}</p>
            <p className="text-[10px] text-white/35">{s.label}</p>
          </div>
        ))}
      </div>

      <nav className="flex gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${tab === t.id ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'text-white/35 hover:bg-white/5'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-4">
          <InfoBlock title="Affectations">
            <InfoRow icon={User} label="Chauffeur" value={truck.driver_name ?? 'Non assigné'} />
            <InfoRow icon={Truck} label="Remorque" value={truck.trailer_label ?? '—'} />
            <InfoRow icon={Building2} label="Garage" value={truck.garage_name ?? '—'} />
          </InfoBlock>
          <InfoBlock title="Conformité">
            <InfoRow icon={Shield} label="Assurance" value={truck.insurance_date ? new Date(truck.insurance_date).toLocaleDateString('fr-FR') : '—'} />
            <InfoRow icon={Calendar} label="Contrôle technique" value={truck.technical_inspection_date ? new Date(truck.technical_inspection_date).toLocaleDateString('fr-FR') : '—'} />
            <InfoRow icon={Wrench} label="Dernière maintenance" value={costs?.last_maintenance_date ? new Date(costs.last_maintenance_date).toLocaleDateString('fr-FR') : '—'} />
            <InfoRow icon={Gauge} label="Prochaine maintenance" value={costs?.next_maintenance_km ? `${costs.next_maintenance_km.toLocaleString()} km` : '—'} />
            <InfoRow icon={Gauge} label="État mécanique" value={costs ? `${costs.mechanical_state}%` : '—'} />
          </InfoBlock>
        </div>
      )}

      {tab === 'maintenance' && (
        <MaintenanceTab
          records={maintenance}
          isAdmin={isAdmin}
          userId={user?.id}
          creating={createMaint.isPending}
          validating={validateMaint.isPending}
          onCreate={input => createMaint.mutate(input)}
          onValidate={(id, actualCost) => user && validateMaint.mutate({ id, approverId: user.id, actualCost })}
        />
      )}

      {tab === 'costs' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Carburant', value: fmtEuro(costBreakdown.fuelCost) },
            { label: 'Réparations', value: fmtEuro(costBreakdown.repairCost) },
            { label: 'Assurance (annuel)', value: fmtEuro(costBreakdown.insuranceCost) },
            { label: 'Maintenance', value: fmtEuro(costBreakdown.maintenanceCost) },
            { label: 'Coût / km', value: `${costBreakdown.costPerKm} €` },
            { label: 'Rentabilité', value: fmtEuro(costBreakdown.profitability) },
          ].map((c, i) => (
            <div key={c.label} className="fleet-stat-card rounded-xl p-4" style={{ animationDelay: `${i * 30}ms` }}>
              <p className="text-[10px] text-white/35 uppercase">{c.label}</p>
              <p className="text-lg font-black text-white mt-1">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'assignments' && (
        <AssignmentsTab
          truck={truck}
          assignments={assignments}
          drivers={drivers}
          trailers={trailers}
          garages={garages}
          isAdmin={isAdmin}
          loading={assignMutation.isPending}
          onAssign={(driverId, trailerId, garageId) =>
            assignMutation.mutate({ truckId: truck.id, driverId, trailerId, garageId })}
        />
      )}

      {tab === 'documents' && (
        <DocumentsTab
          documents={documents}
          isAdmin={isAdmin}
          uploading={uploadDoc.isPending}
          onUpload={(file, docType, expiresAt) => uploadDoc.mutate({ file, docType, expiresAt })}
        />
      )}
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fleet-glass rounded-2xl p-5 space-y-3">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="w-4 h-4 text-red-400/70 shrink-0" />
      <span className="text-white/40 w-28 shrink-0">{label}</span>
      <span className="text-white/80">{value}</span>
    </div>
  );
}

function MaintenanceTab({
  records, isAdmin, userId, creating, validating, onCreate, onValidate,
}: {
  records: FleetMaintenance[];
  isAdmin: boolean;
  userId?: string;
  creating: boolean;
  validating: boolean;
  onCreate: (input: { maintenance_type: MaintenanceType; title: string; description?: string; scheduled_date?: string; estimated_cost?: number }) => void;
  onValidate: (id: string, actualCost?: number) => void;
}) {
  const [type, setType] = useState<MaintenanceType>('oil');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [cost, setCost] = useState('');

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="fleet-glass rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">Planifier une maintenance</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <select className="erp-select w-full text-sm" value={type} onChange={e => setType(e.target.value as MaintenanceType)}>
              {(Object.keys(MAINTENANCE_TYPE_LABELS) as MaintenanceType[]).map(k => (
                <option key={k} value={k}>{MAINTENANCE_TYPE_LABELS[k]}</option>
              ))}
            </select>
            <input className="erp-input w-full text-sm" placeholder="Titre" value={title} onChange={e => setTitle(e.target.value)} />
            <input type="date" className="erp-input w-full text-sm" value={date} onChange={e => setDate(e.target.value)} />
            <input type="number" className="erp-input w-full text-sm" placeholder="Coût estimé €" value={cost} onChange={e => setCost(e.target.value)} />
          </div>
          <button type="button" disabled={!title || creating} className="btn-primary px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
            onClick={() => { onCreate({ maintenance_type: type, title, scheduled_date: date || undefined, estimated_cost: parseFloat(cost) || 0 }); setTitle(''); setCost(''); }}>
            Planifier
          </button>
        </div>
      )}
      <div className="fleet-glass rounded-2xl p-5">
        <ul className="space-y-2">
          {records.length === 0 ? <p className="text-white/30 text-sm">Aucune maintenance enregistrée.</p> : records.map(r => (
            <li key={r.id} className="flex justify-between items-start gap-3 py-2 border-b border-white/5 text-sm">
              <div>
                <p className="text-white font-medium">{MAINTENANCE_TYPE_LABELS[r.maintenance_type]} — {r.title}</p>
                <p className="text-[10px] text-white/35">{MAINTENANCE_STATUS_LABELS[r.status]} · Est. {fmtEuro(r.estimated_cost)} · Réel {fmtEuro(r.actual_cost)}</p>
              </div>
              {isAdmin && !r.validated && r.status !== 'completed' && userId && (
                <button type="button" disabled={validating} onClick={() => onValidate(r.id, r.estimated_cost)}
                  className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> Valider
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AssignmentsTab({
  truck, assignments, drivers, trailers, garages, isAdmin, loading, onAssign,
}: {
  truck: FleetTruck;
  assignments: TruckAssignment[];
  drivers: { id: string; name: string }[];
  trailers: Trailer[];
  garages: Garage[];
  isAdmin: boolean;
  loading: boolean;
  onAssign: (driverId: string | null, trailerId: string | null, garageId: string | null) => void;
}) {
  const [driverId, setDriverId] = useState(truck.driver_id ?? '');
  const [trailerId, setTrailerId] = useState(truck.trailer_id ?? '');
  const [garageId, setGarageId] = useState(truck.garage_id ?? '');

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="fleet-glass rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">Nouvelle affectation</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <select className="erp-select w-full text-sm" value={driverId} onChange={e => setDriverId(e.target.value)}>
              <option value="">— Chauffeur —</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select className="erp-select w-full text-sm" value={trailerId} onChange={e => setTrailerId(e.target.value)}>
              <option value="">— Remorque —</option>
              {trailers.map(t => <option key={t.id} value={t.id}>{t.registration}</option>)}
            </select>
            <select className="erp-select w-full text-sm" value={garageId} onChange={e => setGarageId(e.target.value)}>
              <option value="">— Garage —</option>
              {garages.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <button type="button" disabled={loading} onClick={() => onAssign(driverId || null, trailerId || null, garageId || null)}
            className="btn-primary px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-2">
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            Enregistrer l&apos;affectation
          </button>
        </div>
      )}
      <div className="fleet-glass rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">Historique</h3>
        <ul className="space-y-2">
          {assignments.map(a => (
            <li key={a.id} className="text-sm py-2 border-b border-white/5 flex justify-between">
              <span className="text-white/70">{a.driver_name ?? '—'} · {a.trailer_label ?? '—'} · {a.garage_name ?? '—'}</span>
              <span className="text-white/30 text-xs">{new Date(a.assigned_at).toLocaleDateString('fr-FR')}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const DOC_TYPE_LABELS: Record<TruckDocType, string> = {
  insurance: 'Assurance',
  inspection: 'Contrôle technique',
  registration: 'Carte grise',
  maintenance: 'Maintenance',
  other: 'Autre',
};

function DocumentsTab({
  documents, isAdmin, uploading, onUpload,
}: {
  documents: TruckDocument[];
  isAdmin: boolean;
  uploading: boolean;
  onUpload: (file: File, docType: TruckDocType, expiresAt?: string) => void;
}) {
  const [docType, setDocType] = useState<TruckDocType>('insurance');
  const [expiresAt, setExpiresAt] = useState('');

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="fleet-glass rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">Ajouter un document</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <select className="erp-select w-full text-sm" value={docType} onChange={e => setDocType(e.target.value as TruckDocType)}>
              {(Object.keys(DOC_TYPE_LABELS) as TruckDocType[]).map(k => (
                <option key={k} value={k}>{DOC_TYPE_LABELS[k]}</option>
              ))}
            </select>
            <input type="date" className="erp-input w-full text-sm" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </div>
          <label className="block">
            <input
              type="file"
              className="text-xs text-white/50 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-red-500/20 file:text-red-300"
              disabled={uploading}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) onUpload(file, docType, expiresAt || undefined);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      )}
      <div className="fleet-glass rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">Documents enregistrés</h3>
        {documents.length === 0 ? (
          <p className="text-white/30 text-sm">Aucun document.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map(d => (
              <li key={d.id} className="flex justify-between items-center py-2 border-b border-white/5 text-sm">
                <div>
                  <p className="text-white font-medium">{DOC_TYPE_LABELS[d.doc_type as TruckDocType] ?? d.doc_type}</p>
                  <p className="text-[10px] text-white/35">{d.file_name ?? '—'}{d.expires_at ? ` · Exp. ${new Date(d.expires_at).toLocaleDateString('fr-FR')}` : ''}</p>
                </div>
                {d.file_url && (
                  <a href={d.file_url} target="_blank" rel="noreferrer" className="text-xs text-red-400 hover:text-red-300 shrink-0">
                    Ouvrir
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
