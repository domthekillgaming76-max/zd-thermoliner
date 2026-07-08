import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown, ChevronUp, Eye, EyeOff, Layers, Save, Shield,
} from 'lucide-react';
import { FormAlert, FormSuccess } from '../erp/FormAlert';
import { resolveModuleIcon, MODULE_ICON_OPTIONS } from '../../lib/moduleIcons';
import { getModuleCategories, type AppModuleRecord } from '../../services/appModuleService';
import {
  useAppModulesQuery,
  useSwapModuleOrder,
  useUpdateAppModule,
} from '../../hooks/useAppModules';

const ROLE_OPTIONS = [
  'visitor', 'recruit', 'driver', 'dispatcher', 'fleet_manager', 'manager', 'accountant', 'admin',
  'visiteur', 'candidat', 'chauffeur', 'member', 'directeur', 'patron', 'pdg', 'comptable',
];

interface DraftRow extends AppModuleRecord {
  draftLabel: string;
  draftCategory: string;
  draftIcon: string;
  draftRoles: string[];
  dirty: boolean;
}

function toDraft(m: AppModuleRecord): DraftRow {
  return {
    ...m,
    draftLabel: m.label,
    draftCategory: m.category,
    draftIcon: m.icon,
    draftRoles: [...m.allowed_roles],
    dirty: false,
  };
}

export function SalonsManagementPanel() {
  const { data: modules = [], isLoading } = useAppModulesQuery();
  const updateMutation = useUpdateAppModule();
  const swapMutation = useSwapModuleOrder();

  const [rows, setRows] = useState<DraftRow[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    setRows(modules.map(toDraft));
  }, [modules]);

  const categories = useMemo(() => getModuleCategories(modules), [modules]);

  const grouped = useMemo(() => {
    const map = new Map<string, DraftRow[]>();
    for (const row of rows) {
      const cat = row.draftCategory || 'Autre';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(row);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.sort_order - b.sort_order);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr'));
  }, [rows]);

  function patchRow(id: string, patch: Partial<DraftRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch, dirty: true } : r));
  }

  async function saveRow(row: DraftRow) {
    if (row.id.startsWith('default-')) {
      setPageError('Appliquez la migration Supabase (057_app_modules) pour sauvegarder.');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: row.id,
        patch: {
          label: row.draftLabel.trim() || row.label,
          category: row.draftCategory.trim() || row.category,
          icon: row.draftIcon,
          allowed_roles: row.draftRoles,
          enabled: row.enabled,
          admin_only: row.admin_only,
          key: row.key,
          route: row.route,
          sort_order: row.sort_order,
        },
      });
      setSuccessMessage(`Salon « ${row.draftLabel} » enregistré.`);
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, dirty: false } : r));
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Erreur de sauvegarde.');
    }
  }

  async function toggleEnabled(row: DraftRow) {
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

  async function moveModule(row: DraftRow, direction: 'up' | 'down', siblings: DraftRow[]) {
    const idx = siblings.findIndex(s => s.id === row.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const other = siblings[swapIdx];
    if (row.id.startsWith('default-') || other.id.startsWith('default-')) {
      setPageError('Migration 057 requise pour réordonner.');
      return;
    }
    try {
      await swapMutation.mutateAsync({
        idA: row.id,
        orderA: row.sort_order,
        idB: other.id,
        orderB: other.sort_order,
      });
      setSuccessMessage('Ordre mis à jour.');
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Erreur ordre.');
    }
  }

  async function handleCreateCategory() {
    const name = newCategory.trim();
    if (!name) return;
    setNewCategory('');
    setSuccessMessage(`Catégorie « ${name} » prête — assignez-la à un salon.`);
  }

  function toggleRole(row: DraftRow, role: string) {
    const has = row.draftRoles.includes(role);
    patchRow(row.id, {
      draftRoles: has ? row.draftRoles.filter(r => r !== role) : [...row.draftRoles, role],
    });
  }

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
            <p className="text-sm font-bold text-white">Organisation des salons</p>
            <p className="text-xs text-white/40 mt-1">
              Masquez, renommez, réordonnez et catégorisez les modules. Les changements apparaissent dans le menu sans F5.
            </p>
          </div>
        </div>
      </div>

      {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}
      {successMessage && <FormSuccess message={successMessage} onDismiss={() => setSuccessMessage(null)} />}

      <div className="admin-glass rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/30">Nouvelle catégorie</label>
          <input
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            placeholder="Ex: Opérations, Finance..."
            className="erp-input w-full mt-1"
          />
        </div>
        <button type="button" onClick={() => void handleCreateCategory()}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25">
          Créer catégorie
        </button>
      </div>

      {grouped.map(([category, items]) => (
        <section key={category} className="admin-glass rounded-2xl overflow-hidden border border-white/5">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <Layers className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-bold text-white">{category}</h3>
            <span className="text-[10px] text-white/30">{items.length} salon{items.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {items.map((row, idx) => {
              const Icon = resolveModuleIcon(row.draftIcon);
              return (
                <div key={row.id} className="p-4 space-y-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <input
                        value={row.draftLabel}
                        onChange={e => patchRow(row.id, { draftLabel: e.target.value })}
                        className="erp-input w-full text-sm font-semibold"
                      />
                      <p className="text-[10px] text-white/30 mt-1 font-mono">{row.key} · {row.route}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" title="Monter" disabled={idx === 0}
                        onClick={() => void moveModule(row, 'up', items)}
                        className="w-8 h-8 rounded-lg hover:bg-white/5 text-white/40 disabled:opacity-20">
                        <ChevronUp className="w-4 h-4 mx-auto" />
                      </button>
                      <button type="button" title="Descendre" disabled={idx === items.length - 1}
                        onClick={() => void moveModule(row, 'down', items)}
                        className="w-8 h-8 rounded-lg hover:bg-white/5 text-white/40 disabled:opacity-20">
                        <ChevronDown className="w-4 h-4 mx-auto" />
                      </button>
                      <button type="button" title={row.enabled ? 'Masquer' : 'Afficher'}
                        onClick={() => void toggleEnabled(row)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${row.enabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/30 bg-white/5'}`}>
                        {row.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      {row.admin_only && (
                        <span className="text-[9px] font-bold px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/30">Catégorie</label>
                      <input
                        list="module-categories"
                        value={row.draftCategory}
                        onChange={e => patchRow(row.id, { draftCategory: e.target.value })}
                        className="erp-input w-full mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/30">Icône</label>
                      <select
                        value={row.draftIcon}
                        onChange={e => patchRow(row.id, { draftIcon: e.target.value })}
                        className="erp-select w-full mt-1 text-sm"
                      >
                        {MODULE_ICON_OPTIONS.map(icon => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button type="button" onClick={() => void saveRow(row)}
                        disabled={!row.dirty && !row.id.startsWith('default-')}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 disabled:opacity-40">
                        <Save className="w-3.5 h-3.5" />
                        Sauvegarder
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/30">Rôles autorisés</label>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {ROLE_OPTIONS.map(role => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => toggleRole(row, role)}
                          className={`text-[10px] px-2 py-1 rounded-lg font-semibold border transition-colors ${
                            row.draftRoles.includes(role)
                              ? 'bg-red-500/15 text-red-300 border-red-500/30'
                              : 'bg-white/[0.03] text-white/30 border-white/10 hover:border-white/20'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <datalist id="module-categories">
        {categories.map(c => <option key={c} value={c} />)}
      </datalist>
    </div>
  );
}
