import type { ReactNode } from 'react';
import { useState } from 'react';
import { X, Loader2, Play, CheckCircle2, Ban, Link2, Pencil } from 'lucide-react';
import {
  MISSION_STATUS_LABELS,
  MISSION_PRIORITY_LABELS,
  type TransportMission,
  type MissionAssignment,
} from '../../lib/dispatchTypes';
import { fmtEuro } from '../../lib/format';

interface MissionDetailPanelProps {
  mission: TransportMission;
  assignments: MissionAssignment[];
  drivers: { id: string; name: string }[];
  trucks: { id: string; registration: string; brand?: string | null }[];
  trailers: { id: string; registration: string; type: string }[];
  garages: { id: string; name: string }[];
  canManage: boolean;
  canDeliver: boolean;
  assigning: boolean;
  delivering: boolean;
  onClose: () => void;
  onAssign: (driverId: string | null, truckId: string | null, trailerId: string | null, garageId: string | null, routeNotes: string) => void;
  onStart: () => void;
  onDeliver: () => void;
  onCancel: () => void;
  onEdit?: () => void;
  aiPanel?: ReactNode;
}

export function MissionDetailPanel(props: MissionDetailPanelProps) {
  const {
    mission, assignments, drivers, trucks, trailers, garages,
    canManage, canDeliver, assigning, delivering,
    onClose, onAssign, onStart, onDeliver, onCancel, onEdit, aiPanel,
  } = props;

  const [driverId, setDriverId] = useState(mission.driver_id ?? '');
  const [truckId, setTruckId] = useState(mission.truck_id ?? '');
  const [trailerId, setTrailerId] = useState(mission.trailer_id ?? '');
  const [garageId, setGarageId] = useState(mission.garage_id ?? '');
  const [routeNotes, setRouteNotes] = useState(mission.route_notes ?? '');

  const st = MISSION_STATUS_LABELS[mission.status];
  const pr = MISSION_PRIORITY_LABELS[mission.priority];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="dispatch-glass rounded-t-2xl sm:rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto border border-white/10">
        <div className="p-4 border-b border-white/5 flex items-start justify-between sticky top-0 bg-[#0a0a0a]/95 backdrop-blur">
          <div>
            <p className="text-xs font-mono text-white/35">{mission.reference}</p>
            <h2 className="text-lg font-black text-white">{mission.client_name ?? 'Mission'}</h2>
            <div className="flex gap-2 mt-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${st.bg} ${st.color}`}>{st.label}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full bg-white/5 ${pr.color}`}>{pr.label}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Trajet" value={`${mission.departure_city} → ${mission.arrival_city}`} />
            <Info label="Livraison" value={new Date(mission.delivery_date).toLocaleDateString('fr-FR')} />
            <Info label="Marchandise" value={mission.cargo ?? '—'} />
            <Info label="Prix" value={fmtEuro(mission.price)} />
            <Info label="Distance" value={`${mission.distance_km} km`} />
            <Info label="Poids / palettes" value={`${mission.weight_kg} kg / ${mission.pallets} pal.`} />
          </div>

          {canManage && aiPanel}

          {canManage && !['delivered', 'cancelled'].includes(mission.status) && (
            <div className="dispatch-control-panel rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-red-400 uppercase flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> Affectation</h3>
              <div className="grid grid-cols-2 gap-2">
                <select className="erp-select text-xs" value={driverId} onChange={e => setDriverId(e.target.value)}>
                  <option value="">Chauffeur</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select className="erp-select text-xs" value={truckId} onChange={e => setTruckId(e.target.value)}>
                  <option value="">Camion</option>
                  {trucks.map(t => <option key={t.id} value={t.id}>{t.registration}</option>)}
                </select>
                <select className="erp-select text-xs" value={trailerId} onChange={e => setTrailerId(e.target.value)}>
                  <option value="">Remorque</option>
                  {trailers.map(t => <option key={t.id} value={t.id}>{t.registration}</option>)}
                </select>
                <select className="erp-select text-xs" value={garageId} onChange={e => setGarageId(e.target.value)}>
                  <option value="">Garage</option>
                  {garages.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <input className="erp-input text-xs w-full" placeholder="Itinéraire / notes" value={routeNotes} onChange={e => setRouteNotes(e.target.value)} />
              <button type="button" disabled={assigning} onClick={() => onAssign(driverId || null, truckId || null, trailerId || null, garageId || null, routeNotes)}
                className="btn-primary w-full py-2 rounded-xl text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {assigning && <Loader2 className="w-3 h-3 animate-spin" />}
                Enregistrer l&apos;affectation
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {canManage && onEdit && !['delivered', 'cancelled'].includes(mission.status) && (
              <button type="button" onClick={onEdit} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/5 text-white/60 border border-white/10">
                <Pencil className="w-3.5 h-3.5" /> Modifier
              </button>
            )}
            {canManage && mission.status === 'assigned' && (
              <button type="button" onClick={onStart} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25">
                <Play className="w-3.5 h-3.5" /> Démarrer
              </button>
            )}
            {canDeliver && ['assigned', 'in_progress'].includes(mission.status) && (
              <button type="button" disabled={delivering} onClick={onDeliver} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 disabled:opacity-50">
                {delivering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Marquer livrée
              </button>
            )}
            {canManage && !['delivered', 'cancelled'].includes(mission.status) && (
              <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/5 text-white/40 border border-white/10">
                <Ban className="w-3.5 h-3.5" /> Annuler
              </button>
            )}
          </div>

          {mission.road_sheet_id && (
            <p className="text-xs text-emerald-400">Feuille de route créée — en attente de validation admin.</p>
          )}

          {assignments.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-white/50 uppercase mb-2">Historique affectations</h3>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {assignments.map(a => (
                  <li key={a.id} className="text-xs text-white/40 py-1 border-b border-white/5">
                    {new Date(a.assigned_at).toLocaleDateString('fr-FR')} — {a.route_notes ?? 'Affectation'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-white/35 uppercase">{label}</p>
      <p className="text-white/80 font-medium">{value}</p>
    </div>
  );
}
