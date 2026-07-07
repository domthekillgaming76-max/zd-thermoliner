import { useMemo, useRef, useState } from 'react';
import { Camera, Loader2, Route } from 'lucide-react';
import {
  calculateRoadSheetFullEconomics,
  DEFAULT_FORM_VALUES,
} from '../../lib/roadSheetCalculations';
import type { DriverPortalHome } from '../../lib/driverPortalTypes';
import { formatDriverCurrency } from '../../lib/driverPortalTypes';
import type { RoadSheetFormData } from '../../services/roadSheetService';
import { EMPTY_ROAD_SHEET_FORM } from '../road-sheets/RoadSheetForm';
import { CITIES } from '../road-sheets/constants';

interface DriverMobileRoadSheetFormProps {
  home: DriverPortalHome;
  saving?: boolean;
  onSubmit: (form: RoadSheetFormData, photoFile: File | null) => Promise<void>;
}

const labelClass = 'block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5';

export function DriverMobileRoadSheetForm({ home, saving, onSubmit }: DriverMobileRoadSheetFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [form, setForm] = useState<RoadSheetFormData>({
    ...EMPTY_ROAD_SHEET_FORM,
    driver_id: home.driverId,
    truck_id: home.truckId ?? '',
    trailer_type: home.trailerType ?? '',
    date: new Date().toISOString().split('T')[0],
  });

  const economics = useMemo(
    () =>
      calculateRoadSheetFullEconomics({
        km: form.km,
        pricePerKm: form.price_per_km,
        fuelConsumptionL100: form.fuel_consumption_l100,
        fuelPricePerLiter: form.fuel_price_per_liter,
        tollCost: form.toll_cost,
        repairCost: form.repair_cost,
        insuranceCost: form.insurance_cost,
        otherExpenses: form.other_expenses,
        driverSalaryMode: form.driver_salary_mode,
        driverSalaryValue: form.driver_salary_value,
      }),
    [form],
  );

  function update<K extends keyof RoadSheetFormData>(key: K, value: RoadSheetFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handlePhoto(file: File | null) {
    setPhotoFile(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.departure.trim() || !form.arrival.trim() || form.km <= 0) return;
    await onSubmit(form, photoFile);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 driver-portal-fade-in">
      <div>
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <Route className="w-5 h-5 text-red-400" />
          Feuille de route
        </h2>
        <p className="text-xs text-white/40 mt-0.5">Soumission mobile — validation DOM76</p>
      </div>

      <div className="driver-portal-glass rounded-2xl p-4 space-y-4">
        <div>
          <label className={labelClass}>Départ</label>
          <input
            list="driver-cities"
            className="erp-input w-full text-base"
            value={form.departure}
            onChange={e => update('departure', e.target.value)}
            placeholder="Ville de départ"
            required
          />
        </div>

        <div>
          <label className={labelClass}>Arrivée</label>
          <input
            list="driver-cities"
            className="erp-input w-full text-base"
            value={form.arrival}
            onChange={e => update('arrival', e.target.value)}
            placeholder="Ville d'arrivée"
            required
          />
        </div>

        <datalist id="driver-cities">
          {CITIES.map(c => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <div>
          <label className={labelClass}>Marchandise</label>
          <input
            className="erp-input w-full text-base"
            value={form.cargo}
            onChange={e => update('cargo', e.target.value)}
            placeholder="Type de cargo"
          />
        </div>

        <div>
          <label className={labelClass}>Kilomètres</label>
          <input
            type="number"
            min={1}
            className="erp-input w-full text-base text-xl font-bold"
            value={form.km || ''}
            onChange={e => update('km', Number(e.target.value) || 0)}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Photo preuve</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => handlePhoto(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="driver-portal-action-btn driver-portal-action-amber w-full rounded-2xl p-4 flex items-center justify-center gap-3"
          >
            <Camera className="w-6 h-6" />
            <span className="font-bold">{photoFile ? photoFile.name : 'Prendre / choisir une photo'}</span>
          </button>
          {photoPreview && (
            <img src={photoPreview} alt="Aperçu" className="mt-3 rounded-xl w-full max-h-40 object-cover" />
          )}
        </div>
      </div>

      <div className="driver-portal-stat-card rounded-2xl p-4 grid grid-cols-2 gap-3">
        <CalcItem label="Revenu" value={formatDriverCurrency(economics.revenue)} />
        <CalcItem label="Carburant" value={formatDriverCurrency(economics.fuelCost)} />
        <CalcItem label="Péages" value={formatDriverCurrency(economics.tollCost)} />
        <CalcItem label="Salaire ch." value={formatDriverCurrency(economics.driverSalary)} />
        <CalcItem label="Dépenses" value={formatDriverCurrency(economics.totalExpenses)} highlight />
        <CalcItem label="Marge" value={`${economics.marginPercent.toFixed(1)} %`} />
      </div>

      <button
        type="submit"
        disabled={saving || !form.departure || !form.arrival || form.km <= 0}
        className="driver-portal-submit-btn w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
        Soumettre à validation DOM76
      </button>

      <p className="text-[10px] text-center text-white/30 px-4">
        Tarif km par défaut : {DEFAULT_FORM_VALUES.pricePerKm} € — calcul automatique des coûts
      </p>
    </form>
  );
}

function CalcItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-white/35 uppercase font-semibold">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}
