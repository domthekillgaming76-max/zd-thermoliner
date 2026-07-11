import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Layers, Save, Shield, X } from 'lucide-react';
import { FormAlert, FormSuccess } from '../erp/FormAlert';
import { SalonsDragBoard, type SalonDraftRow } from './SalonsDragBoard';
import { MODULE_ICON_OPTIONS, resolveModuleIcon } from '../../lib/moduleIcons';
import { SALON_COLUMNS } from '../../lib/salonColumns';
import type { AppModuleRecord } from '../../services/appModuleService';
import {
  useAppModulesQuery,
  useBatchUpdateModuleLayout,
  useUpdateAppModule,
} from '../../hooks/useAppModules';

import { ASSIGNABLE_ROLES } from '../../lib/accessPolicy';

const ROLE_OPTIONS: string[] = [...ASSIGNABLE_ROLES];

function toDraft(m: AppModuleRecord): SalonDraftRow {
  return {
    ...m,
    draftLabel: m.label,
    draftCategory: m.category,
    draftIcon: m.icon,
    draftRoles: [...m.allowed_roles],
  };
}

export function SalonsManagementPanel() {
  const { data: modules = [], isLoading } = useAppModulesQuery();
  const updateMutation = useUpdateAppModule();
  const batchLayoutMutation = useBatchUpdateModuleLayout();

  const [rows, setRows] = useState<SalonDraftRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    setRows(modules.map(toDraft));
  }, [modules]);

  const selected = useMemo(
    () => rows.find(r => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  function patchRow(id: string, patch: Partial<SalonDraftRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }

  async function handleLayoutSave(
    updates: Array<{ id: string; category: string; sort_order: number }>,
  ): Promise<void> {
    if (updates.some(u => u.id.startsWith('default-'))) {
      setPageError('Appliquez la migration Supabase (057_app_modules) pour réorganiser.');
      return;
    }
    await batchLayoutMutation.mutateAsync(updates);
    setRows(prev => prev.map(row => {
      const update = updates.find(u => u.id === row.id);
      if (!update) return row;
      return { ...row, draftCategory: update.category, category: update.category, sort_order: update.sort_order };
    }));
    setSuccessMessage('Organisation sauvegardée');
  }

  async function saveSelected() {
    if (!selected) return;
    if (selected.id.startsWith('default-')) {
      setPageError('Appliquez la migration Supabase (057_app_modules) pour sauvegarder.');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: selected.id,
        patch: {
          label: selected.draftLabel.trim() || selected.label,
          category: selected.draftCategory.trim() || selected.category,
          icon: selected.draftIcon,
          allowed_roles: selected.draftRoles,
          enabled: selected.enabled,
          admin_only: selected.admin_only,
          key: selected.key,
          route: selected.route,
          sort_order: selected.sort_order,
        },
      });
      setSuccessMessage(`Salon « ${selected.draftLabel} » enregistré.`);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Erreur de sauvegarde.');
    }
  }

  async function toggleEnabled(row: SalonDraftRow) {
    patchRow(row.id, { enabled: !row.enabled });
    if (!row.id.startsWith('default-')) {
      try {
        await updateMutation.mutateAsync({ id: row.id, patch: { enabled: !row.enabled } });
        setSuccessMessage(!row.enabled ? 'Salon activé.' : 'Salon masqué.');
      } catch (err) {
        setPageError(err instanceof Error ? err.message : 'Erreur.');
        patchRow(row.id, { enabled: row.enabled });
      }
    }
  }

  function removeRole(role: string) {
    if (!selected) return;
    patchRow(selected.id, {
      draftRoles: selected.draftRoles.filter(r => r !== role),
    });
  }

  function addRole(role: string) {
    if (!selected || selected.draftRoles.includes(role)) return;
    patchRow(selected.id, {
      draftRoles: [...selected.draftRoles, role],
    });
  }

  const assignedRoles = selected?.draftRoles ?? [];
  const availableRoles = ROLE_OPTIONS.filter(r => !assignedRoles.includes(r));
  const orphanRoles = assignedRoles.filter(r => !ROLE_OPTIONS.includes(r));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-10 h-10 border-4 border-white/10 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="admin-glass rounded-2xl p-4 border border-red-500/15">
        <div className="flex items-start gap-3">
          <Layers className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white">Organisation drag & drop</p>
            <p className="text-xs text-white/40 mt-1">
              Glissez les cartes entre colonnes ou réordonnez-les. La sauvegarde est automatique. Le menu se met à jour sans F5.
            </p>
          </div>
        </div>
      </div>

      {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}
      {successMessage && <FormSuccess message={successMessage} onDismiss={() => setSuccessMessage(null)} />}

      <SalonsDragBoard
        rows={rows}
        saving={batchLayoutMutation.isPending}
        selectedId={selectedId}
        onSelect={row => setSelectedId(row.id)}
        onLayoutSave={handleLayoutSave}
      />

      {selected && (
        <section className="admin-glass rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {(() => {
                const Icon = resolveModuleIcon(selected.draftIcon);
                return (
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-red-400" />
                  </div>
                );
              })()}
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">Édition — {selected.draftLabel}</p>
                <p className="text-[10px] text-white/30 font-mono">{selected.key} · {selected.route}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void toggleEnabled(selected)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                  selected.enabled
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-white/5 text-white/40 border border-white/10'
                }`}
              >
                {selected.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {selected.enabled ? 'Actif' : 'Masqué'}
              </button>
              {selected.admin_only && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Admin only
                </span>
              )}
              <button
                type="button"
                onClick={() => void saveSelected()}
                disabled={updateMutation.isPending}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" />
                Sauvegarder
              </button>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/30">Nom affiché</label>
              <input
                value={selected.draftLabel}
                onChange={e => patchRow(selected.id, { draftLabel: e.target.value })}
                className="erp-input w-full mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/30">Catégorie</label>
              <select
                value={selected.draftCategory}
                onChange={e => patchRow(selected.id, { draftCategory: e.target.value })}
                className="erp-select w-full mt-1 text-sm"
              >
                {SALON_COLUMNS.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/30">Icône</label>
              <select
                value={selected.draftIcon}
                onChange={e => patchRow(selected.id, { draftIcon: e.target.value })}
                className="erp-select w-full mt-1 text-sm"
              >
                {MODULE_ICON_OPTIONS.map(icon => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/30">
                Rôles autorisés — cliquez sur ✕ pour supprimer
              </label>
              {assignedRoles.length === 0 ? (
                <p className="text-xs text-white/30 mt-2">Aucun rôle — salon visible par personne (sauf admin).</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {assignedRoles.map(role => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-semibold border bg-red-500/15 text-red-300 border-red-500/30"
                    >
                      {role}
                      <button
                        type="button"
                        title={`Supprimer le rôle ${role}`}
                        onClick={() => removeRole(role)}
                        className="hover:text-white transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {orphanRoles.length > 0 && (
                <p className="text-[10px] text-amber-400/70 mt-2">
                  Rôles personnalisés détectés — vous pouvez les retirer avec ✕.
                </p>
              )}
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/30">Ajouter un rôle</label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {availableRoles.map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => addRole(role)}
                    className="text-[10px] px-2 py-1 rounded-lg font-semibold border bg-white/[0.03] text-white/40 border-white/10 hover:border-red-500/30 hover:text-red-300 transition-colors"
                  >
                    + {role}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
