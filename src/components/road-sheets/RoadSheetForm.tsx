import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { isValidDriverUuid } from '../../services/roadSheetService';
import {
  calculateRoadSheetFullEconomics,
  DEFAULT_FORM_VALUES,
} from '../../lib/roadSheetCalculations';
import type { Driver, Truck } from '../../lib/supabase';
import type { RoadSheetFormData } from '../../services/roadSheetService';
import { FormAlert, validateRoadSheetForm } from '../erp/FormAlert';
import { RoadSheetEconomicsPreview } from './RoadSheetEconomicsPreview';
import { CityAutocomplete } from './CityAutocomplete';
import {
  DRIVER_SALARY_MODES,
  TRAILER_TYPES,
  type DriverSalaryMode,
} from './constants';

const inputClass = 'erp-input';
const selectClass = 'erp-select';
const labelClass = 'block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5';

export const EMPTY_ROAD_SHEET_FORM: RoadSheetFormData = {
  driver_id: '',
  truck_id: '',
  trailer_type: '',
  departure: '',
  arrival: '',
  cargo: '',
  km: 0,
  price_per_km: DEFAULT_FORM_VALUES.pricePerKm,
  fuel_price_per_liter: DEFAULT_FORM_VALUES.fuelPricePerLiter,
  fuel_consumption_l100: DEFAULT_FORM_VALUES.fuelConsumptionL100,
  toll_cost: 0,
  repair_cost: 0,
  insurance_cost: 0,
  other_expenses: 0,
  driver_salary_mode: 'percentage',
  driver_salary_value: 20,
  notes: '',
  date: new Date().toISOString().split('T')[0],
};

interface RoadSheetFormProps {
  drivers: Driver[];
  trucks: Truck[];
  currentUserId?: string;
  defaultDriverName?: string;
  initialForm?: RoadSheetFormData;
  submitLabel?: string;
  saving?: boolean;
  onSubmit: (form: RoadSheetFormData, photoFile: File | null) => Promise<void>;
  onCancel: () => void;
  onError?: (message: string) => void;
}

function FormField({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export function RoadSheetForm({
  drivers,
  trucks,
  currentUserId,
  defaultDriverName: _defaultDriverName,
  initialForm,
  submitLabel = 'Enregistrer la feuille',
  saving = false,
  onSubmit,
  onCancel,
  onError,
}: RoadSheetFormProps) {
  const [form, setForm] = useState<RoadSheetFormData>(initialForm ?? EMPTY_ROAD_SHEET_FORM);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isSaving = saving || submitting;

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

  function applyDriverSelection(driverId: string) {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;

    let truckId = driver.truck_id ?? '';
    if (!truckId) {
      const assignedTruck = trucks.find(t => t.driver_id === driver.id);
      truckId = assignedTruck?.id ?? '';
    }

    setForm(prev => ({
      ...prev,
      driver_id: driver.id,
      truck_id: truckId || prev.truck_id,
    }));
  }

  useEffect(() => {
    if (isValidDriverUuid(form.driver_id) && drivers.some(d => d.id === form.driver_id)) {
      return;
    }

    if (drivers.length === 1) {
      applyDriverSelection(drivers[0].id);
      return;
    }

    if (currentUserId) {
      const ownDriver = drivers.find(d => d.user_id === currentUserId);
      if (ownDriver) {
        applyDriverSelection(ownDriver.id);
      }
    }
  }, [drivers, trucks, currentUserId, form.driver_id]);

  function handleDriverChange(driverId: string) {
    applyDriverSelection(driverId);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log('[Z&D] RoadSheetForm handleSubmit called', { form, photoFile: !!photoFile });
    setError(null);

    const validationError = validateRoadSheetForm(form);
    if (validationError) {
      console.warn('[Z&D] RoadSheetForm validation failed:', validationError);
      setError(validationError);
      onError?.(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(form, photoFile);
      console.log('[Z&D] RoadSheetForm onSubmit completed successfully');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de l\'enregistrement.';
      console.error('[Z&D] RoadSheetForm save error:', err);
      setError(message);
      onError?.(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="p-5 space-y-5">
      {error && <FormAlert message={error} onDismiss={() => setError(null)} />}
      {isSaving && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-white/60 text-sm"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Loader2 className="w-4 h-4 animate-spin text-red-400" />
          Enregistrement en cours...
        </div>
      )}
      {/* Route & assignment */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70 mb-3">
          Affectation
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Chauffeur *">
            <select
              value={form.driver_id}
              required
              onChange={e => handleDriverChange(e.target.value)}
              className={selectClass}
              disabled={drivers.length === 0}
            >
              <option value="">
                {drivers.length === 0 ? 'Aucun chauffeur disponible' : 'Sélectionner'}
              </option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Date *">
            <input
              type="date"
              required
              value={form.date}
              onChange={e => update('date', e.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Camion">
            <select
              value={form.truck_id}
              onChange={e => update('truck_id', e.target.value)}
              className={selectClass}
            >
              <option value="">Sélectionner</option>
              {trucks.map(t => (
                <option key={t.id} value={t.id}>
                  {t.registration}{t.brand ? ` — ${t.brand}` : ''}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Remorque">
            <select
              value={form.trailer_type}
              onChange={e => update('trailer_type', e.target.value)}
              className={selectClass}
            >
              <option value="">Aucune / N/A</option>
              {TRAILER_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </FormField>
        </div>
      </div>

      {/* Route */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70 mb-3">
          Itinéraire
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CityAutocomplete
            label="Ville de départ *"
            value={form.departure}
            onChange={v => update('departure', v)}
            required
            inputClassName={inputClass}
          />
          <CityAutocomplete
            label="Ville d'arrivée *"
            value={form.arrival}
            onChange={v => update('arrival', v)}
            required
            inputClassName={inputClass}
          />
          <FormField label="Cargaison" className="sm:col-span-2">
            <input
              value={form.cargo}
              onChange={e => update('cargo', e.target.value)}
              placeholder="Acier, alimentaire, conteneur..."
              className={inputClass}
            />
          </FormField>
        </div>
      </div>

      {/* Distance & pricing */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70 mb-3">
          Distance & tarification
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <FormField label="Kilomètres *">
            <input
              type="number"
              min={1}
              required
              value={form.km || ''}
              onChange={e => update('km', parseInt(e.target.value) || 0)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Prix / km (€)">
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.price_per_km}
              onChange={e => update('price_per_km', parseFloat(e.target.value) || 0)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Conso camion (L/100km)">
            <input
              type="number"
              step="0.1"
              min="0"
              value={form.fuel_consumption_l100}
              onChange={e => update('fuel_consumption_l100', parseFloat(e.target.value) || 0)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Prix carburant (€/L)">
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.fuel_price_per_liter}
              onChange={e => update('fuel_price_per_liter', parseFloat(e.target.value) || 0)}
              className={inputClass}
            />
          </FormField>
        </div>
      </div>

      {/* Expenses */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70 mb-3">
          Dépenses
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([
            ['toll_cost', 'Péages (€)'],
            ['repair_cost', 'Réparations (€)'],
            ['insurance_cost', 'Assurance (€)'],
            ['other_expenses', 'Autres (€)'],
          ] as const).map(([key, label]) => (
            <FormField key={key} label={label}>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form[key]}
                onChange={e => update(key, parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </FormField>
          ))}
        </div>
      </div>

      {/* Driver salary */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70 mb-3">
          Rémunération chauffeur
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Mode de salaire">
            <select
              value={form.driver_salary_mode}
              onChange={e => update('driver_salary_mode', e.target.value as DriverSalaryMode)}
              className={selectClass}
            >
              {DRIVER_SALARY_MODES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Valeur">
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.driver_salary_value}
              onChange={e => update('driver_salary_value', parseFloat(e.target.value) || 0)}
              className={inputClass}
            />
          </FormField>
        </div>
      </div>

      {/* Live preview */}
      {form.km > 0 && <RoadSheetEconomicsPreview economics={economics} />}

      {/* Photo */}
      <FormField label="Photo de livraison (optionnelle)">
        <div
          onClick={() => fileRef.current?.click()}
          className="rounded-xl border-2 border-dashed cursor-pointer hover:border-red-500/40 transition-colors"
          style={{
            borderColor: photoPreview ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)',
            minHeight: 80,
          }}
        >
          {photoPreview ? (
            <img src={photoPreview} alt="" className="w-full max-h-36 object-cover rounded-xl" />
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-white/25">
              <Camera className="w-7 h-7 mb-1" />
              <span className="text-xs">Cliquer pour ajouter une photo</span>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
        </div>
      </FormField>

      <FormField label="Notes">
        <textarea
          value={form.notes}
          onChange={e => update('notes', e.target.value)}
          rows={2}
          placeholder="Remarques optionnelles..."
          className="erp-input erp-textarea resize-none"
        />
      </FormField>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 py-3 bg-white/5 rounded-xl text-white/50 text-sm disabled:opacity-40"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 btn-primary py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}
