import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, KeyRound, Shield } from 'lucide-react';
import { FormAlert } from '../erp/FormAlert';
import { MODULE_ICON_OPTIONS, resolveModuleIcon } from '../../lib/moduleIcons';
import { SALON_COLUMNS } from '../../lib/salonColumns';
import { ROLE_LABELS } from '../../lib/accessPolicy';
import type { AppRole } from '../../lib/roleEngine';
import type { RoomPermission } from '../../lib/roomTypes';
import {
  toggleRoomRole,
  updateRoomPermission,
} from '../../services/roomPermissionService';
import {
  useBatchUpdateRoomOrder,
  useRoomPermissionsQuery,
} from '../../hooks/useRoomPermissions';

const ROLE_OPTIONS: AppRole[] = ['visiteur', 'chauffeur', 'admin'];

export function RolesSalonsPanel() {
  const { data: rooms = [], isLoading } = useRoomPermissionsQuery();
  const batchMutation = useBatchUpdateRoomOrder();
  const [error, setError] = useState<string | null>(null);
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const grouped = useMemo(() => {
    const map = new Map<string, RoomPermission[]>();
    for (const room of rooms) {
      const cat = room.category || 'ERP';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(room);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'));
  }, [rooms]);

  const scheduleSave = useCallback((id: string, patch: Parameters<typeof updateRoomPermission>[1]) => {
    if (id.startsWith('default-')) {
      setError('Appliquez la migration Supabase 077 pour enregistrer les permissions.');
      return;
    }
    const prev = saveTimers.current.get(id);
    if (prev) clearTimeout(prev);
    saveTimers.current.set(id, setTimeout(() => {
      void updateRoomPermission(id, patch).catch(err => {
        setError(err instanceof Error ? err.message : 'Erreur de sauvegarde.');
      });
    }, 400));
  }, []);

  useEffect(() => () => {
    for (const t of saveTimers.current.values()) clearTimeout(t);
  }, []);

  async function moveRoom(room: RoomPermission, direction: -1 | 1) {
    const catRooms = grouped.find(([c]) => c === room.category)?.[1] ?? [];
    const idx = catRooms.findIndex(r => r.id === room.id);
    const swap = catRooms[idx + direction];
    if (!swap || room.id.startsWith('default-') || swap.id.startsWith('default-')) return;
    await batchMutation.mutateAsync([
      { id: room.id, sort_order: swap.sort_order, category: room.category },
      { id: swap.id, sort_order: room.sort_order, category: swap.category },
    ]);
  }

  function handleRoleToggle(room: RoomPermission, role: AppRole, checked: boolean) {
    if (room.admin_critical && role === 'admin' && !checked) {
      setError('L\'accès admin est obligatoire pour ce salon critique.');
      return;
    }
    const nextRoles = toggleRoomRole(room.visible_to_roles, role, checked);
    scheduleSave(room.id, { visible_to_roles: nextRoles });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-10 h-10 border-4 border-white/10 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="admin-glass rounded-2xl p-4 border border-amber-500/15">
        <div className="flex items-start gap-3">
          <KeyRound className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white">Rôles et salons</p>
            <p className="text-xs text-white/40 mt-1">
              Cochez les rôles autorisés pour chaque salon. Les modifications sont enregistrées automatiquement.
              Les salons critiques conservent toujours l&apos;accès admin.
            </p>
          </div>
        </div>
      </div>

      {error && <FormAlert message={error} onDismiss={() => setError(null)} />}

      {grouped.map(([category, catRooms]) => (
        <section key={category} className="admin-glass rounded-2xl border border-white/5 overflow-hidden">
          <header className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white/40">{category}</span>
            <span className="text-[10px] text-white/25">{catRooms.length} salon(s)</span>
          </header>
          <div className="divide-y divide-white/5">
            {catRooms.map(room => {
              const Icon = resolveModuleIcon(room.icon);
              return (
                <div key={room.id} className="px-4 py-3 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3 min-w-[200px] flex-1">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${room.color}22`, border: `1px solid ${room.color}44` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: room.color }} />
                    </div>
                    <div className="min-w-0">
                      <input
                        defaultValue={room.room_name}
                        onBlur={e => {
                          const v = e.target.value.trim();
                          if (v && v !== room.room_name) scheduleSave(room.id, { room_name: v });
                        }}
                        className="erp-input text-sm font-semibold w-full max-w-xs"
                      />
                      <p className="text-[10px] text-white/30 font-mono mt-0.5">{room.room_key}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      defaultValue={room.category}
                      onChange={e => scheduleSave(room.id, { category: e.target.value })}
                      className="erp-select text-xs"
                    >
                      {SALON_COLUMNS.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                    <select
                      defaultValue={room.icon}
                      onChange={e => scheduleSave(room.id, { icon: e.target.value })}
                      className="erp-select text-xs max-w-[140px]"
                    >
                      {MODULE_ICON_OPTIONS.map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                    <input
                      type="color"
                      defaultValue={room.color}
                      onChange={e => scheduleSave(room.id, { color: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border border-white/10"
                      title="Couleur"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    {ROLE_OPTIONS.map(role => (
                      <label key={role} className="flex items-center gap-1.5 text-xs text-white/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={room.visible_to_roles.includes(role)}
                          onChange={e => handleRoleToggle(room, role, e.target.checked)}
                          className="rounded border-white/20"
                        />
                        {ROLE_LABELS[role]}
                      </label>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    {room.admin_critical && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Critique
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => scheduleSave(room.id, { enabled: !room.enabled })}
                      className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${
                        room.enabled
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-white/5 text-white/35'
                      }`}
                    >
                      {room.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {room.enabled ? 'Actif' : 'Off'}
                    </button>
                    <button type="button" onClick={() => void moveRoom(room, -1)} className="p-1 text-white/30 hover:text-white">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => void moveRoom(room, 1)} className="p-1 text-white/30 hover:text-white">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
