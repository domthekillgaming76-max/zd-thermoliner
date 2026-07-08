import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, Shield } from 'lucide-react';
import { resolveModuleIcon } from '../../lib/moduleIcons';
import {
  SALON_COLUMNS,
  buildColumnMap,
  columnDroppableId,
  columnMapToUpdates,
  parseColumnDroppableId,
  type SalonColumn,
} from '../../lib/salonColumns';
import type { AppModuleRecord } from '../../services/appModuleService';

export interface SalonDraftRow extends AppModuleRecord {
  draftLabel: string;
  draftCategory: string;
  draftIcon: string;
  draftRoles: string[];
}

interface SalonsDragBoardProps {
  rows: SalonDraftRow[];
  saving: boolean;
  onSelect: (row: SalonDraftRow) => void;
  selectedId: string | null;
  onLayoutSave: (updates: Array<{ id: string; category: string; sort_order: number }>) => Promise<void>;
}

function rowsToColumnIds(rows: SalonDraftRow[]): Record<SalonColumn, string[]> {
  const map = buildColumnMap(rows);
  return Object.fromEntries(
    SALON_COLUMNS.map(col => [col, map[col].map(r => r.id)]),
  ) as Record<SalonColumn, string[]>;
}

function SortableSalonCard({
  row,
  selected,
  onSelect,
}: {
  row: SalonDraftRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });
  const Icon = resolveModuleIcon(row.draftIcon);
  const rolePreview = row.draftRoles.slice(0, 3);
  const extraRoles = row.draftRoles.length - rolePreview.length;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`rounded-xl border p-3 cursor-pointer transition-all ${
        selected
          ? 'border-red-500/40 bg-red-500/10 shadow-lg shadow-red-500/5'
          : 'border-white/8 bg-white/[0.03] hover:border-red-500/20 hover:bg-white/[0.05]'
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 touch-none text-white/25 hover:text-red-400 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
          aria-label="Glisser pour déplacer"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">{row.draftLabel}</p>
          <p className="text-[10px] text-white/30 font-mono truncate mt-0.5">{row.route}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {rolePreview.map(role => (
              <span key={role} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                {role}
              </span>
            ))}
            {extraRoles > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">+{extraRoles}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {row.enabled ? (
            <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-0.5">
              <Eye className="w-3 h-3" /> Actif
            </span>
          ) : (
            <span className="text-[9px] font-bold text-white/30 flex items-center gap-0.5">
              <EyeOff className="w-3 h-3" /> Masqué
            </span>
          )}
          {row.admin_only && (
            <span className="text-[9px] font-bold text-amber-400 flex items-center gap-0.5">
              <Shield className="w-3 h-3" /> Admin
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SalonCardPreview({ row }: { row: SalonDraftRow }) {
  const Icon = resolveModuleIcon(row.draftIcon);
  return (
    <div className="rounded-xl border border-red-500/40 bg-[#141414] p-3 shadow-2xl w-[260px] rotate-2">
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-red-400" />
        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-red-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">{row.draftLabel}</p>
          <p className="text-[10px] text-white/30 font-mono truncate">{row.route}</p>
        </div>
      </div>
    </div>
  );
}

function CategoryColumn({
  column,
  itemIds,
  rowMap,
  selectedId,
  onSelect,
}: {
  column: SalonColumn;
  itemIds: string[];
  rowMap: Map<string, SalonDraftRow>;
  selectedId: string | null;
  onSelect: (row: SalonDraftRow) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDroppableId(column) });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[240px] max-w-[280px] flex-1 rounded-2xl border transition-colors ${
        isOver ? 'border-red-500/35 bg-red-500/[0.04]' : 'border-white/8 bg-white/[0.02]'
      }`}
    >
      <div className="px-3 py-2.5 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-xs font-bold text-white">{column}</h3>
        <span className="text-[10px] text-white/30">{itemIds.length}</span>
      </div>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 space-y-2 min-h-[120px] max-h-[520px] overflow-y-auto">
          {itemIds.length === 0 ? (
            <p className="text-center text-[10px] text-white/20 py-8 px-2">Glissez un salon ici</p>
          ) : (
            itemIds.map(id => {
              const row = rowMap.get(id);
              if (!row) return null;
              return (
                <SortableSalonCard
                  key={id}
                  row={row}
                  selected={selectedId === id}
                  onSelect={() => onSelect(row)}
                />
              );
            })
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function SalonsDragBoard({
  rows,
  saving,
  onSelect,
  selectedId,
  onLayoutSave,
}: SalonsDragBoardProps) {
  const rowMap = useMemo(() => new Map(rows.map(r => [r.id, r])), [rows]);
  const [columns, setColumns] = useState<Record<SalonColumn, string[]>>(() => rowsToColumnIds(rows));
  const [activeId, setActiveId] = useState<string | null>(null);
  const columnsRef = useRef(columns);

  useEffect(() => {
    const next = rowsToColumnIds(rows);
    setColumns(next);
    columnsRef.current = next;
  }, [rows]);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findContainer = useCallback((id: string): SalonColumn | null => {
    const col = parseColumnDroppableId(id);
    if (col && (SALON_COLUMNS as readonly string[]).includes(col)) return col as SalonColumn;
    for (const column of SALON_COLUMNS) {
      if (columns[column].includes(id)) return column;
    }
    return null;
  }, [columns]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(String(active.id));
    const overContainer = findContainer(String(over.id));
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setColumns(prev => {
      const activeItems = [...prev[activeContainer]];
      const overItems = [...prev[overContainer]];
      const activeIndex = activeItems.indexOf(String(active.id));
      if (activeIndex === -1) return prev;

      activeItems.splice(activeIndex, 1);

      let insertIndex = overItems.length;
      if (!String(over.id).startsWith('column:')) {
        const overIndex = overItems.indexOf(String(over.id));
        if (overIndex >= 0) insertIndex = overIndex;
      }

      overItems.splice(insertIndex, 0, String(active.id));

      const next = { ...prev, [activeContainer]: activeItems, [overContainer]: overItems };
      columnsRef.current = next;
      return next;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    let nextColumns = { ...columnsRef.current };
    const activeContainer = findContainer(String(active.id));
    const overContainer = findContainer(String(over.id));

    if (activeContainer && overContainer && activeContainer === overContainer) {
      const items = [...nextColumns[activeContainer]];
      const oldIndex = items.indexOf(String(active.id));
      let newIndex = items.indexOf(String(over.id));
      if (String(over.id).startsWith('column:')) {
        newIndex = items.length - 1;
      }
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        nextColumns = {
          ...nextColumns,
          [activeContainer]: arrayMove(items, oldIndex, newIndex),
        };
        setColumns(nextColumns);
        columnsRef.current = nextColumns;
      }
    }

    const updates = columnMapToUpdates(columnsRef.current);
    if (updates.some(u => u.id.startsWith('default-'))) return;

    try {
      await onLayoutSave(updates);
    } catch {
      setColumns(rowsToColumnIds(rows));
    }
  };

  const activeRow = activeId ? rowMap.get(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={event => { void handleDragEnd(event); }}
    >
      <div className={`overflow-x-auto pb-2 ${saving ? 'opacity-70 pointer-events-none' : ''}`}>
        <div className="flex gap-3 min-w-max">
          {SALON_COLUMNS.map(column => (
            <CategoryColumn
              key={column}
              column={column}
              itemIds={columns[column]}
              rowMap={rowMap}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
        {activeRow ? <SalonCardPreview row={activeRow} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
