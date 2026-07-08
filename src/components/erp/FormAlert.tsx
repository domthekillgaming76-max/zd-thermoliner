import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { isValidCityInput } from '../../lib/citySuggestions';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface FormAlertProps {
  message: string;
  onDismiss?: () => void;
}

export function FormAlert({ message, onDismiss }: FormAlertProps) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl text-red-400 text-sm"
      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
      role="alert"
    >
      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 hover:text-red-300 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

interface FormSuccessProps {
  message: string;
  onDismiss?: () => void;
}

export function FormSuccess({ message, onDismiss }: FormSuccessProps) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl text-emerald-400 text-sm"
      style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
      role="status"
    >
      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 hover:text-emerald-300 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function validateRoadSheetForm(form: {
  driver_id: string;
  departure: string;
  arrival: string;
  date: string;
  km: number;
}): string | null {
  if (!form.driver_id || !UUID_RE.test(form.driver_id)) {
    return 'Sélectionnez un chauffeur dans la liste.';
  }
  if (!isValidCityInput(form.departure)) return 'Indiquez la ville de départ (minimum 2 caractères).';
  if (!isValidCityInput(form.arrival)) return 'Indiquez la ville d\'arrivée (minimum 2 caractères).';
  if (!form.date) return 'Indiquez la date.';
  if (!form.km || form.km <= 0) return 'Indiquez une distance en kilomètres supérieure à 0.';
  return null;
}
