import { useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  MapPin,
  Pencil,
  Trash2,
  Truck,
} from 'lucide-react';
import { extractRoadSheetFullEconomics } from '../../lib/roadSheetCalculations';
import type { Driver, RoadSheet, Truck as TruckType } from '../../lib/supabase';
import { RoadSheetEconomicsPreview } from './RoadSheetEconomicsPreview';
import { ValidationActions, ValidationBadge } from './ValidationActions';

interface RoadSheetListProps {
  sheets: RoadSheet[];
  drivers: Driver[];
  trucks: TruckType[];
  isAdministrator: boolean;
  canValidate: boolean;
  currentUserId?: string;
  canEditSheet: (sheet: RoadSheet) => boolean;
  onValidate: (sheet: RoadSheet) => void;
  onReject: (sheetId: string, reason: string) => void;
  onEdit: (sheet: RoadSheet) => void;
  onDelete: (id: string) => void;
  validating?: boolean;
  rejecting?: boolean;
  deleting?: boolean;
}

function getKm(s: RoadSheet) {
  return s.km || s.total_distance || 0;
}

function getDeparture(s: RoadSheet) {
  return s.departure || s.departure_city || '—';
}

function getArrival(s: RoadSheet) {
  return s.arrival || s.arrival_city || '—';
}

function getCargo(s: RoadSheet) {
  return s.cargo || s.cargo_type || '—';
}

export function RoadSheetList({
  sheets,
  drivers,
  trucks,
  isAdministrator,
  canValidate,
  canEditSheet,
  onValidate,
  onReject,
  onEdit,
  onDelete,
  validating,
  rejecting,
}: RoadSheetListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const driverMap = new Map(drivers.map(d => [d.id, d.name]));
  const truckMap = new Map(trucks.map(t => [t.id, t.registration]));

  return (
    <div className="space-y-3">
      {sheets.map(sheet => {
        const km = getKm(sheet);
        const economics = extractRoadSheetFullEconomics(sheet);
        const isExpanded = expandedId === sheet.id;
        const truckLabel = sheet.truck_id ? truckMap.get(sheet.truck_id) : null;

        return (
          <div key={sheet.id} className="card-premium overflow-hidden">
            <div className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center">
                {sheet.delivery_photo_url ? (
                  <img src={sheet.delivery_photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-5 h-5 text-white/15" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-white">
                    {sheet.driver_name || (sheet.driver_id ? driverMap.get(sheet.driver_id) : null) || 'Chauffeur'}
                  </p>
                  <ValidationBadge sheet={sheet} />
                  {sheet.trailer_type && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                      {sheet.trailer_type}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/30 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {new Date(sheet.date).toLocaleDateString('fr-FR')} • {getDeparture(sheet)} → {getArrival(sheet)}
                  {truckLabel && (
                    <>
                      <span className="mx-1">•</span>
                      <Truck className="w-3 h-3 inline" /> {truckLabel}
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-white font-semibold tabular-nums">{km.toLocaleString()} km</p>
                  <p className={`text-xs tabular-nums ${economics.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {economics.netProfit.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € net
                  </p>
                </div>

                <ValidationActions
                  sheet={sheet}
                  canValidate={canValidate}
                  onValidate={onValidate}
                  onReject={onReject}
                  validating={validating}
                  rejecting={rejecting}
                />

                {canEditSheet(sheet) && (
                  <button
                    type="button"
                    onClick={() => onEdit(sheet)}
                    title="Modifier"
                    className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center"
                  >
                    <Pencil className="w-4 h-4 text-white/40" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : sheet.id)}
                  className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-white/40" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white/40" />
                  )}
                </button>

                {isAdministrator && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Supprimer cette feuille de route ?')) onDelete(sheet.id);
                    }}
                    className="w-8 h-8 hover:bg-red-500/10 rounded-lg flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4 text-white/20 hover:text-red-400" />
                  </button>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                {sheet.delivery_photo_url && (
                  <img
                    src={sheet.delivery_photo_url}
                    alt="Livraison"
                    className="w-full max-h-56 object-cover rounded-xl"
                  />
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {[
                    { label: 'Cargaison', value: getCargo(sheet) },
                    { label: 'Prix/km', value: `${sheet.price_per_km} €` },
                    { label: 'Revenu brut', value: `${economics.revenue.toLocaleString('fr-FR')} €` },
                    { label: 'Km parcourus', value: `${km.toLocaleString()} km` },
                  ].map(d => (
                    <div key={d.label} className="bg-white/3 rounded-lg p-2.5">
                      <p className="text-white/30 text-xs mb-0.5">{d.label}</p>
                      <p className="text-white font-semibold">{d.value}</p>
                    </div>
                  ))}
                </div>

                <RoadSheetEconomicsPreview economics={economics} compact />

                {sheet.rejection_reason && (
                  <p className="text-sm text-red-400/80 bg-red-500/5 rounded-lg px-3 py-2 border border-red-500/15">
                    Rejet : {sheet.rejection_reason}
                  </p>
                )}

                {sheet.notes && (
                  <p className="text-sm text-white/40 italic">{sheet.notes}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
