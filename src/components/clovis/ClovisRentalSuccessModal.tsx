import { useEffect, useState } from 'react';
import { CheckCircle2, Download, KeyRound, Loader2, X } from 'lucide-react';
import { fmtEuro } from '../../lib/format';
import type { ClovisRentalStartResult } from '../../lib/clovisRentalTypes';
import {
  downloadClovisHandoverImage,
  generateClovisHandoverImage,
} from '../../lib/clovisHandoverImage';

interface ClovisRentalSuccessModalProps {
  open: boolean;
  result: ClovisRentalStartResult | null;
  driverName: string;
  photoUrl?: string | null;
  onClose: () => void;
}

export function ClovisRentalSuccessModal({
  open,
  result,
  driverName,
  photoUrl,
  onClose,
}: ClovisRentalSuccessModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open || !result) {
      setImageUrl(null);
      setImageError(null);
      return;
    }

    let cancelled = false;
    setGenerating(true);
    setImageError(null);

    void generateClovisHandoverImage({
      driverName,
      vehicleLabel: result.vehicle_label,
      contractRef: result.contract_ref,
      photoUrl,
    })
      .then(url => {
        if (!cancelled) setImageUrl(url);
      })
      .catch(err => {
        if (!cancelled) {
          setImageError(err instanceof Error ? err.message : 'Image non générée');
        }
      })
      .finally(() => {
        if (!cancelled) setGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, result, driverName, photoUrl]);

  if (!open || !result) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="clovis-agency rounded-2xl w-full max-w-2xl border border-emerald-500/25 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-white/6 flex items-center justify-between bg-emerald-500/5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-white">Location confirmée</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="text-center space-y-2">
            <p className="text-lg font-black text-amber-300">
              Clovis vous remercie pour votre location
            </p>
            <p className="text-sm text-white/50">{result.message}</p>
            <p className="text-xs text-white/35">
              Contrat <span className="text-white/60 font-mono">{result.contract_ref}</span>
              {' · '}
              {result.vehicle_label}
              {' · '}
              {fmtEuro(result.daily_rate)}/jour
            </p>
          </div>

          <div className="rounded-xl overflow-hidden border border-amber-500/20 bg-black/40">
            {generating ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                <p className="text-xs text-white/40">Génération de la remise des clés…</p>
              </div>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt="Remise des clés Clovis"
                className="w-full h-auto block"
              />
            ) : (
              <div className="py-12 px-4 text-center">
                <KeyRound className="w-10 h-10 text-amber-400/50 mx-auto mb-2" />
                <p className="text-sm text-white/40">
                  {imageError ?? 'Certificat indisponible'}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {imageUrl && (
              <button
                type="button"
                onClick={() => downloadClovisHandoverImage(imageUrl, result.contract_ref)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-amber-200 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
              >
                <Download className="w-4 h-4" />
                Télécharger l&apos;image
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-primary px-4 py-3 rounded-xl text-sm font-bold"
            >
              Voir ma location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
