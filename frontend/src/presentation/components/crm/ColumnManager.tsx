'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCrmTable } from '../../../application/context/crm-table';

/**
 * ==========================================================================
 * Column Manager (HubSpot "Editar columnas")
 * ==========================================================================
 *
 * Full-featured column editor:
 *   - Search within available properties
 *   - Toggle visibility per column
 *   - Reorder via drag handles
 *   - Group by property group (Contact Info, Activity, etc.)
 *   - "Select All" / "Deselect All" per group
 *   - Persist preferences via API on close
 *   - Click-outside to dismiss
 * ==========================================================================
 */

export default function ColumnManager() {
  const { state, dispatch, toggleColumn, saveColumnPreferences } = useCrmTable();
  const [search, setSearch] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Click-outside dismissal
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        dispatch({ type: 'TOGGLE_COLUMN_EDITOR' });
        saveColumnPreferences();
      }
    }
    if (state.showColumnEditor) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [state.showColumnEditor, dispatch, saveColumnPreferences]);

  // Group columns by property group
  const groups = useMemo(() => {
    const map = new Map<string, typeof state.columns>();
    for (const col of state.columns) {
      const search_lower = search.toLowerCase();
      if (search && !col.label.toLowerCase().includes(search_lower) && !col.key.toLowerCase().includes(search_lower)) {
        continue;
      }
      // Derive group from key naming convention or use 'general'
      let group = 'Informacion general';
      if (col.key.includes('activity') || col.key.includes('last_')) group = 'Actividad';
      if (col.key.includes('content') || col.key.includes('channel') || col.key.includes('preferred')) group = 'Conversion';
      if (col.key.includes('create_date') || col.key.includes('owner')) group = 'Sistema';

      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(col);
    }
    return map;
  }, [state.columns, search]);

  const visibleCount = state.columns.filter((c) => c.visible).length;
  const totalCount = state.columns.length;

  // Drag handlers
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== targetIdx) {
      dispatch({ type: 'REORDER_COLUMNS', payload: { fromIndex: dragIdx, toIndex: targetIdx } });
      setDragIdx(targetIdx);
    }
  };
  const handleDragEnd = () => setDragIdx(null);

  const toggleGroupAll = (groupColumns: typeof state.columns, visible: boolean) => {
    const newColumns = state.columns.map((c) => {
      const inGroup = groupColumns.find((gc) => gc.key === c.key);
      return inGroup ? { ...c, visible } : c;
    });
    dispatch({ type: 'SET_COLUMNS', payload: newColumns });
  };

  return (
    <AnimatePresence>
      {state.showColumnEditor && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="absolute right-4 top-2 z-50 w-80 rounded-lg border border-neutral-200 bg-white shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-neutral-800">Editar columnas</h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">{visibleCount} de {totalCount} visibles</p>
            </div>
            <button
              onClick={() => { dispatch({ type: 'TOGGLE_COLUMN_EDITOR' }); saveColumnPreferences(); }}
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3l8 8M11 3l-8 8"/>
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-2 border-b border-neutral-100">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar propiedad..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-full rounded-md border border-neutral-200 bg-neutral-50 pl-8 pr-3 text-xs outline-none focus:border-primary-400 focus:bg-white focus:ring-1 focus:ring-primary-100"
                autoFocus
              />
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="5" cy="5" r="3.5"/><path d="M8 8l2.5 2.5"/>
              </svg>
            </div>
          </div>

          {/* Column list by group */}
          <div className="max-h-[360px] overflow-y-auto px-2 py-2">
            {Array.from(groups.entries()).map(([groupName, cols]) => {
              const allVisible = cols.every((c) => c.visible);
              return (
                <div key={groupName} className="mb-3 last:mb-0">
                  {/* Group header */}
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                      {groupName}
                    </span>
                    <button
                      onClick={() => toggleGroupAll(cols, !allVisible)}
                      className="text-[10px] text-primary-500 hover:text-primary-700 font-medium"
                    >
                      {allVisible ? 'Ocultar todas' : 'Mostrar todas'}
                    </button>
                  </div>

                  {/* Columns in group */}
                  {cols.map((col) => {
                    const globalIdx = state.columns.findIndex((c) => c.key === col.key);
                    return (
                      <div
                        key={col.key}
                        draggable
                        onDragStart={() => handleDragStart(globalIdx)}
                        onDragOver={(e) => handleDragOver(e, globalIdx)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-grab transition-colors ${
                          dragIdx === globalIdx ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-neutral-50'
                        }`}
                      >
                        {/* Drag handle */}
                        <svg width="10" height="10" viewBox="0 0 10 10" className="flex-shrink-0 text-neutral-300">
                          <circle cx="3" cy="2" r="1" fill="currentColor"/>
                          <circle cx="7" cy="2" r="1" fill="currentColor"/>
                          <circle cx="3" cy="5" r="1" fill="currentColor"/>
                          <circle cx="7" cy="5" r="1" fill="currentColor"/>
                          <circle cx="3" cy="8" r="1" fill="currentColor"/>
                          <circle cx="7" cy="8" r="1" fill="currentColor"/>
                        </svg>

                        {/* Checkbox */}
                        <label className="flex items-center gap-2 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={col.visible}
                            onChange={() => toggleColumn(col.key)}
                            className="h-3.5 w-3.5 rounded border-neutral-300 text-primary-500 focus:ring-primary-400"
                          />
                          <span className={`text-sm ${col.visible ? 'text-neutral-800 font-medium' : 'text-neutral-500'}`}>
                            {col.label}
                          </span>
                        </label>

                        {/* Property type badge */}
                        <span className="text-[9px] uppercase tracking-wider text-neutral-300 font-mono">
                          {col.type}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {groups.size === 0 && (
              <p className="text-xs text-neutral-400 text-center py-6">No se encontraron propiedades</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2.5">
            <button
              onClick={() => {
                dispatch({ type: 'SET_COLUMNS', payload: state.columns.map((c) => ({ ...c, visible: true })) });
              }}
              className="text-xs text-neutral-500 hover:text-neutral-700"
            >
              Mostrar todas
            </button>
            <button
              onClick={() => { dispatch({ type: 'TOGGLE_COLUMN_EDITOR' }); saveColumnPreferences(); }}
              className="rounded-md bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600 transition-colors"
            >
              Aplicar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
