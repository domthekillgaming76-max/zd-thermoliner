import { ExternalLink, KeyRound, Truck, X, Building2 } from 'lucide-react';
import { fmtEuro } from '../../lib/format';
import { CLOVIS_STEAM_MOD_URL } from '../../lib/clovisRentalTypes';
import type { ClovisCatalogItem } from '../../lib/clovisRentalTypes';

interface ClovisRentConfirmModalProps {
  open: boolean;
  item: ClovisCatalogItem | null;
  companyBalance: number | null;
  renting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ClovisRentConfirmModal({
  open,
  item,
  companyBalance,
  renting,
  onClose,
  onConfirm,
}: ClovisRentConfirmModalProps) {
  if (!open || !item) return null;

  const accent = item.accent_color || '#f59e0b';

  function openSteamMod() {
    window.open(CLOVIS_STEAM_MOD_URL, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="clovis-agency rounded-2xl w-full max-w-lg border border-amber-500/20 shadow-2xl"
        style={{ boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px ${accent}33` }}
      >
        <div className="p-4 border-b border-white/6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-white">Confirmer la location</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={renting}
            className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center disabled:opacity-40"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div
            className="rounded-xl p-4 border"
            style={{ borderColor: `${accent}33`, background: `${accent}10` }}
          >
            <div className="flex items-start gap-3">
              {item.photo_url ? (
                <img
                  src={item.photo_url}
                  alt=""
                  className="w-20 h-14 rounded-lg object-cover border border-white/10 shrink-0"
                />
              ) : (
                <div className="w-20 h-14 rounded-lg bg-black/40 flex items-center justify-center shrink-0">
                  <Truck className="w-6 h-6 text-amber-400/60" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-white">{item.label}</p>
                <p className="text-xs text-white/45 mt-0.5">
                  {item.brand} {item.model}
                  {item.variant ? ` · ${item.variant}` : ''}
                </p>
                <p className="text-lg font-black text-amber-400 mt-2">
                  {fmtEuro(item.daily_rate)}
                  <span className="text-xs font-normal text-white/35"> / jour</span>
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl px-4 py-3 bg-black/30 border border-white/6 text-xs text-white/50 space-y-1">
            <p className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400/70" />
              La 1<sup>re</sup> journée sera prélevée sur le compte entreprise
              {companyBalance !== null && (
                <span className="text-emerald-400/80"> ({fmtEuro(companyBalance)} disponible)</span>
              )}
            </p>
            <p>Un seul véhicule Clovis par chauffeur à la fois.</p>
          </div>

          <div className="rounded-xl p-4 border border-blue-500/20 bg-blue-500/5 space-y-3">
            <p className="text-sm font-semibold text-white">Mod ETS2 / ATS recommandé</p>
            <p className="text-xs text-white/45 leading-relaxed">
              Pour rouler avec le camion Clovis en jeu, téléchargez le mod Steam Workshop.
              Vous pouvez aussi louer sans télécharger le mod.
            </p>
            <button
              type="button"
              onClick={openSteamMod}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Télécharger le mod Clovis (Steam)
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={renting}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white/50 hover:bg-white/5 border border-white/8 disabled:opacity-40"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={renting}
              className="flex-1 btn-primary px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              {renting ? 'Contrat en cours…' : 'Louer sans télécharger'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
