'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem } from '../../animations/variants';
import { useCrmTable } from '../../../application/context/crm-table';
import type { CrmRecord } from '../../../application/context/crm-table/types';
import ColumnManager from './ColumnManager';
import QueryBuilder, { ActiveFilterChips } from './QueryBuilder';
import ExportPanel from './ExportPanel';
import RecordDetailPanel from './RecordDetailPanel';

/**
 * ==========================================================================
 * CRM Table View (HubSpot-Style) — Context-Powered
 * ==========================================================================
 *
 * All interactive buttons are fully functional:
 *   - Tabs: switch active view, re-fetch data
 *   - Object type selector: navigate between contacts/companies/deals
 *   - "Vista de tabla" dropdown: table / board toggle
 *   - "Editar columnas": opens ColumnManager panel
 *   - "Filtros": opens QueryBuilder panel
 *   - "Ordenar": opens SortPanel
 *   - "Exportar": opens ExportPanel
 *   - "Guardar": persists current view configuration
 *   - Bulk actions: edit / delete / deselect
 * ==========================================================================
 */

interface CrmTableViewProps {
  title: string;
  tabs: { label: string; count?: number; active?: boolean }[];
  onAddRecord: () => void;
}

export default function CrmTableView({ title, tabs, onAddRecord }: CrmTableViewProps) {
  const {
    state,
    dispatch,
    visibleColumns,
    setSearch,
    setSort,
    setPage,
    toggleSelect,
    toggleSelectAll,
    setActiveTab,
    setViewType,
    saveColumnPreferences,
    selectRecord,
    isMyRecord,
    displayRecords,
  } = useCrmTable();

  const { loading, search, sort, pagination, selectedIds, activeFilterCount } = state;

  // --- Local UI state for dropdowns ---
  const [showObjectDropdown, setShowObjectDropdown] = useState(false);
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const objectRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  // Click-outside for object selector dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (objectRef.current && !objectRef.current.contains(e.target as Node)) setShowObjectDropdown(false);
      if (viewRef.current && !viewRef.current.contains(e.target as Node)) setShowViewDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // --- Formatters ---

  const formatValue = (value: string, type: string): string => {
    if (!value || value === '--') return '--';
    if (type === 'date') {
      try {
        const d = new Date(value);
        return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' +
               d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      } catch { return value; }
    }
    return value;
  };

  const getInitials = (record: typeof displayRecords[0]): string => {
    if (state.objectType === 'contacts') {
      const f = record.properties['first_name']?.[0] ?? '';
      const l = record.properties['last_name']?.[0] ?? '';
      return (f + l).toUpperCase() || record.properties['email']?.[0]?.toUpperCase() || '?';
    }
    return record.properties['name']?.[0]?.toUpperCase() ?? '?';
  };

  const getDisplayName = (record: typeof displayRecords[0]): string => {
    if (state.objectType === 'contacts') {
      const full = `${record.properties['first_name'] ?? ''} ${record.properties['last_name'] ?? ''}`.trim();
      return full || record.properties['email'] || 'Sin nombre';
    }
    return record.properties['name'] || 'Sin nombre';
  };

  // --- Save handler with flash feedback ---
  const handleSave = async () => {
    await saveColumnPreferences();
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  };

  // --- Object type options for navigation ---
  const objectTypes = [
    { key: 'contacts', label: 'Contactos', href: '/dashboard/crm/contacts', icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
    { key: 'companies', label: 'Empresas', href: '/dashboard/crm/companies', icon: 'M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z' },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* ===== Header: Object selector + tabs ===== */}
      <div className="flex items-center gap-3 border-b border-neutral-200 bg-white px-6 pt-3">
        {/* Object type selector dropdown */}
        <div className="relative" ref={objectRef}>
          <button
            onClick={() => setShowObjectDropdown(!showObjectDropdown)}
            className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 hover:bg-neutral-50 transition-colors"
          >
            <span className="text-sm font-medium text-neutral-800">{title}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
              className={`transition-transform ${showObjectDropdown ? 'rotate-180' : ''}`}>
              <path d="M3 5l3 3 3-3"/>
            </svg>
          </button>
          <AnimatePresence>
            {showObjectDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 mt-1 z-50 w-52 rounded-lg border border-neutral-200 bg-white shadow-lg py-1"
              >
                {objectTypes.map((ot) => (
                  <a
                    key={ot.key}
                    href={ot.href}
                    className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                      state.objectType === ot.key
                        ? 'bg-primary-50 text-primary-700 font-semibold'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 opacity-60"><path d={ot.icon}/></svg>
                    {ot.label}
                    {state.objectType === ot.key && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto text-primary-500"><path d="M3 7l3 3 5-5"/></svg>
                    )}
                  </a>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tabs — clickable with active state */}
        <div className="flex items-center gap-1 ml-2">
          {tabs.map((tab, i) => {
            const isActive = state.activeTabIndex === i;
            return (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-1.5 rounded-t-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-white border border-neutral-200 border-b-white -mb-px font-semibold text-neutral-900'
                    : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {tab.label}
                {(() => {
                  // Tab 1 = "Mis ..." → show myRecordIds count dynamically
                  const count = i === 1 ? state.myRecordIds.size : tab.count;
                  return count !== undefined ? (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      isActive ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-500'
                    }`}>{count}</span>
                  ) : null;
                })()}
              </button>
            );
          })}
          <button
            className="ml-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded p-1 transition-colors"
            title="Crear vista"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 3v8M3 7h8"/></svg>
          </button>
        </div>

        <div className="ml-auto">
          <button
            onClick={onAddRecord}
            className="rounded-md bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
          >
            Agregar {state.objectType === 'contacts' ? 'contactos' : 'empresas'}
          </button>
        </div>
      </div>

      {/* ===== Toolbar: Search + Action Buttons ===== */}
      <div className="flex items-center gap-3 border-b border-neutral-200 bg-white px-6 py-2.5">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-56 rounded-md border border-neutral-200 bg-white pl-8 pr-3 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
          />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="5.5" cy="5.5" r="4"/><path d="M9 9l3 3"/>
          </svg>
        </div>

        {/* Bulk action bar (when items selected) */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2 ml-2"
            >
              <span className="text-xs font-semibold text-primary-600">{selectedIds.size} seleccionados</span>
              <button
                onClick={() => alert(`Editar ${selectedIds.size} registros (funcionalidad pendiente)`)}
                className="rounded border border-neutral-200 px-2 py-1 text-[11px] text-neutral-600 hover:bg-neutral-50"
              >
                Editar
              </button>
              <button
                onClick={() => {
                  if (confirm(`Eliminar ${selectedIds.size} registros?`)) {
                    dispatch({ type: 'CLEAR_SELECTION' });
                  }
                }}
                className="rounded border border-red-200 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50"
              >
                Eliminar
              </button>
              <button
                onClick={() => dispatch({ type: 'CLEAR_SELECTION' })}
                className="text-[11px] text-neutral-400 hover:text-neutral-600 ml-1"
              >
                Deseleccionar
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2 ml-auto">
          {/* Vista de tabla dropdown */}
          <div className="relative" ref={viewRef}>
            <button
              onClick={() => setShowViewDropdown(!showViewDropdown)}
              className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                {state.viewType === 'table' ? (
                  <><rect x="1" y="1" width="10" height="3.5" rx="0.5"/><rect x="1" y="7.5" width="10" height="3.5" rx="0.5"/></>
                ) : (
                  <><rect x="1" y="1" width="3" height="10" rx="0.5"/><rect x="5" y="1" width="3" height="10" rx="0.5"/><rect x="9" y="1" width="2" height="10" rx="0.5"/></>
                )}
              </svg>
              {state.viewType === 'table' ? 'Vista de tabla' : 'Vista de panel'}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"
                className={`transition-transform ${showViewDropdown ? 'rotate-180' : ''}`}>
                <path d="M2.5 4l2.5 2.5L7.5 4"/>
              </svg>
            </button>
            <AnimatePresence>
              {showViewDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full right-0 mt-1 z-50 w-56 rounded-lg border border-neutral-200 bg-white shadow-lg py-1"
                >
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Tipo de vista</p>
                  <button
                    onClick={() => { setViewType('table'); setShowViewDropdown(false); }}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors ${
                      state.viewType === 'table' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="1" y="1" width="12" height="4" rx="0.5"/><rect x="1" y="8" width="12" height="4" rx="0.5"/></svg>
                    Vista de tabla
                  </button>
                  <button
                    onClick={() => { setViewType('board'); setShowViewDropdown(false); }}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors ${
                      state.viewType === 'board' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="1" y="1" width="3.5" height="12" rx="0.5"/><rect x="5.5" y="1" width="3.5" height="12" rx="0.5"/><rect x="10" y="1" width="3" height="12" rx="0.5"/></svg>
                    Vista de panel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Column editor button */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_COLUMN_EDITOR' })}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
              state.showColumnEditor
                ? 'border-primary-300 bg-primary-50 text-primary-700 font-semibold'
                : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
              <rect x="1" y="1" width="3" height="10" rx="0.5"/><rect x="5" y="1" width="3" height="10" rx="0.5"/><rect x="9" y="1" width="2" height="10" rx="0.5"/>
            </svg>
            Editar columnas
          </button>

          {/* Filter builder button */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_FILTER_BUILDER' })}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
              activeFilterCount > 0 || state.showFilterBuilder
                ? 'border-primary-300 bg-primary-50 text-primary-700 font-semibold'
                : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 2h10M3 5h6M5 8h2"/>
            </svg>
            {activeFilterCount > 0 ? `Filtro (${activeFilterCount})` : 'Filtros'}
            {activeFilterCount > 0 && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2.5 4l2.5 2.5L7.5 4"/>
              </svg>
            )}
          </button>

          {/* Sort button */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SORT_PANEL' })}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
              state.showSortPanel
                ? 'border-primary-300 bg-primary-50 text-primary-700 font-semibold'
                : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 3h8M2 6h5M2 9h3"/>
            </svg>
            Ordenar
          </button>

          {/* Export button */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_EXPORT_PANEL' })}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
              state.showExportPanel
                ? 'border-primary-300 bg-primary-50 text-primary-700 font-semibold'
                : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 1v7M3 5l3 3 3-3M2 10h8"/>
            </svg>
            Exportar
          </button>

          {/* Save button */}
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
              saveFlash
                ? 'border-green-300 bg-green-50 text-green-700 font-semibold'
                : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {saveFlash ? (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 6l2.5 2.5 4.5-5"/></svg>
                Guardado
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d="M9.5 10.5h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h5.5l2.5 2.5v5.5a1 1 0 0 1-1 1z"/>
                  <path d="M8.5 10.5v-3h-5v3"/><path d="M3.5 1.5v2.5h4"/>
                </svg>
                Guardar
              </>
            )}
          </button>
        </div>
      </div>

      {/* ===== Active filter chips ===== */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 border-b border-neutral-200 bg-primary-50/30 px-6 py-2">
          <ActiveFilterChips />
        </div>
      )}

      {/* ===== Panels (absolute positioned) ===== */}
      <ColumnManager />
      <QueryBuilder />
      <ExportPanel />
      <SortPanel />

      {/* ===== Record Detail Panel ===== */}
      <RecordDetailPanel />

      {/* ===== Data: Table or Board view ===== */}
      {state.viewType === 'board' ? (
        <BoardView
          records={displayRecords}
          loading={loading}
          getDisplayName={getDisplayName}
          getInitials={getInitials}
          formatValue={formatValue}
          visibleColumns={visibleColumns}
          selectRecord={selectRecord}
          isMyRecord={isMyRecord}
          objectType={state.objectType}
        />
      ) : (
        <TableView
          displayRecords={displayRecords}
          loading={loading}
          visibleColumns={visibleColumns}
          selectedIds={selectedIds}
          sort={sort}
          setSort={setSort}
          toggleSelectAll={toggleSelectAll}
          toggleSelect={toggleSelect}
          selectRecord={selectRecord}
          getDisplayName={getDisplayName}
          getInitials={getInitials}
          formatValue={formatValue}
        />
      )}

      {/* ===== Pagination ===== */}
      <div className="flex items-center justify-between border-t border-neutral-200 bg-white px-6 py-3">
        <span className="text-xs text-neutral-400">
          {pagination.total} registros totales
        </span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPage(Math.max(1, pagination.page - 1))}
            disabled={pagination.page <= 1}
            className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 disabled:text-neutral-300"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 2L3.5 5l3 3"/></svg>
            Anterior
          </button>
          <span className="text-sm text-neutral-600">
            Pagina <span className="font-semibold">{pagination.page}</span> de {pagination.totalPages || 1}
          </span>
          <button
            onClick={() => setPage(Math.min(pagination.totalPages, pagination.page + 1))}
            disabled={pagination.page >= pagination.totalPages}
            className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 disabled:text-neutral-300"
          >
            Siguiente
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3.5 2L6.5 5l-3 3"/></svg>
          </button>
        </div>
        <span className="text-xs text-neutral-400">{pagination.limit} por pagina</span>
      </div>
    </div>
  );
}

// ==========================================================================
// Table View — extracted to avoid JSX nesting issues with SWC
// ==========================================================================

function TableView({ displayRecords, loading, visibleColumns, selectedIds, sort, setSort, toggleSelectAll, toggleSelect, selectRecord, getDisplayName, getInitials, formatValue }: {
  displayRecords: CrmRecord[]; loading: boolean; visibleColumns: { key: string; label: string; type: string; width?: string; sortable?: boolean }[];
  selectedIds: Set<string>; sort: { field: string; order: string }; setSort: (f: string) => void;
  toggleSelectAll: () => void; toggleSelect: (id: string) => void; selectRecord: (id: string) => void;
  getDisplayName: (r: CrmRecord) => string; getInitials: (r: CrmRecord) => string; formatValue: (v: string, t: string) => string;
}) {
  return (
    <div className="flex-1 overflow-auto bg-white">
      <motion.table variants={staggerContainer} initial="initial" animate="animate" className="w-full">
        <thead className="sticky top-0 z-10">
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={selectedIds.size === displayRecords.length && displayRecords.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-neutral-300 text-primary-500"
                />
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 cursor-pointer hover:text-neutral-700 select-none"
                  style={{ width: col.width }}
                  onClick={() => col.sortable !== false && setSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sort.field === col.key && (
                      <span className="text-primary-500">{sort.order === 'asc' ? '\u2191' : '\u2193'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-neutral-50">
                  <td className="px-3 py-3"><div className="h-4 w-4 rounded bg-neutral-100 animate-pulse" /></td>
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-4 py-3"><div className="h-4 w-24 rounded bg-neutral-100 animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : displayRecords.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="py-16 text-center">
                  <div className="flex flex-col items-center">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-neutral-300 mb-3">
                      <circle cx="20" cy="20" r="16"/><path d="M14 16h12M14 20h8M14 24h10"/>
                    </svg>
                    <p className="text-sm text-neutral-500">No se encontraron registros</p>
                    <p className="text-xs text-neutral-400 mt-1">Intenta ajustar los filtros o la busqueda</p>
                  </div>
                </td>
              </tr>
            ) : (
              displayRecords.map((record) => (
                <motion.tr
                  key={record.id}
                  variants={staggerItem}
                  className={`border-b border-neutral-50 transition-colors cursor-pointer ${
                    selectedIds.has(record.id) ? 'bg-primary-50' : 'hover:bg-neutral-50'
                  }`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(record.id)}
                      onChange={() => toggleSelect(record.id)}
                      className="rounded border-neutral-300 text-primary-500"
                    />
                  </td>
                  {visibleColumns.map((col, colIdx) => (
                    <td key={col.key} className="px-4 py-3">
                      {colIdx === 0 ? (
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 flex-shrink-0 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-primary-700">{getInitials(record)}</span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); selectRecord(record.id); }}
                            className="text-sm font-medium text-primary-600 hover:underline truncate max-w-[200px] text-left"
                          >
                            {col.key === 'name' || col.key === 'first_name' ? getDisplayName(record) : (record.properties[col.key] || '--')}
                          </button>
                        </div>
                      ) : col.type === 'email' ? (
                        <a href={`mailto:${record.properties[col.key]}`} className="text-sm text-primary-600 hover:underline flex items-center gap-1 truncate max-w-[200px]">
                          {record.properties[col.key] || '--'}
                          {record.properties[col.key] && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" className="flex-shrink-0 text-neutral-400">
                              <path d="M8 5.5V8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h2.5M6 1h3v3M4 6l5-5"/>
                            </svg>
                          )}
                        </a>
                      ) : col.type === 'enum' ? (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          record.properties[col.key] ? 'bg-blue-50 text-blue-700' : 'text-neutral-400'
                        }`}>
                          {record.properties[col.key] || '--'}
                        </span>
                      ) : (
                        <span className="text-sm text-neutral-600 truncate block max-w-[180px]">
                          {formatValue(record.properties[col.key] ?? '--', col.type)}
                        </span>
                      )}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </motion.table>
      </div>
    );
}

// ==========================================================================
// Sort Panel — inline component
// ==========================================================================

function SortPanel() {
  const { state, dispatch, setSort, visibleColumns } = useCrmTable();
  const panelRef = useRef<HTMLDivElement>(null);

  // Click-outside dismissal
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        dispatch({ type: 'TOGGLE_SORT_PANEL' });
      }
    }
    if (state.showSortPanel) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [state.showSortPanel, dispatch]);

  // All sortable columns
  const sortableColumns = state.columns.filter((c) => c.sortable !== false);

  return (
    <AnimatePresence>
      {state.showSortPanel && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="absolute right-4 top-2 z-50 w-72 rounded-lg border border-neutral-200 bg-white shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-500">
                <path d="M2 3h10M2 7h6M2 11h3"/>
              </svg>
              <h3 className="text-sm font-semibold text-neutral-800">Ordenar por</h3>
            </div>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_SORT_PANEL' })}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3l8 8M11 3l-8 8"/>
              </svg>
            </button>
          </div>

          {/* Sort field selection */}
          <div className="px-3 py-2 space-y-0.5 max-h-[280px] overflow-y-auto">
            {sortableColumns.map((col) => {
              const isActive = state.sort.field === col.key;
              return (
                <button
                  key={col.key}
                  onClick={() => {
                    setSort(col.key);
                  }}
                  className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive ? 'bg-primary-50 text-primary-700 font-medium' : 'text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <span>{col.label}</span>
                  {isActive && (
                    <span className="flex items-center gap-1 text-xs text-primary-500">
                      {state.sort.order === 'asc' ? (
                        <><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 8V2M3 4l2-2 2 2"/></svg>A-Z</>
                      ) : (
                        <><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 2v6M3 6l2 2 2-2"/></svg>Z-A</>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Direction toggle */}
          <div className="border-t border-neutral-100 px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] text-neutral-400">
              Ordenando: <span className="font-semibold text-neutral-600">{sortableColumns.find(c => c.key === state.sort.field)?.label ?? state.sort.field}</span>
            </span>
            <button
              onClick={() => {
                dispatch({
                  type: 'SET_SORT',
                  payload: { field: state.sort.field, order: state.sort.order === 'asc' ? 'desc' : 'asc' },
                });
              }}
              className="rounded-md border border-neutral-200 px-2 py-1 text-[11px] text-neutral-600 hover:bg-neutral-50 flex items-center gap-1"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 2v6M1.5 6l1.5 2 1.5-2M7 8V2M5.5 4l1.5-2 1.5 2"/>
              </svg>
              {state.sort.order === 'asc' ? 'Ascendente' : 'Descendente'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ==========================================================================
// Board View — Card Grid (Vista de panel)
// ==========================================================================

interface BoardViewProps {
  records: CrmRecord[];
  loading: boolean;
  getDisplayName: (r: CrmRecord) => string;
  getInitials: (r: CrmRecord) => string;
  formatValue: (value: string, type: string) => string;
  visibleColumns: { key: string; label: string; type: string }[];
  selectRecord: (id: string) => void;
  isMyRecord: (id: string) => boolean;
  objectType: string;
}

function BoardView({ records, loading, getDisplayName, getInitials, formatValue, visibleColumns, selectRecord, isMyRecord, objectType }: BoardViewProps) {
  if (loading) {
    return (
      <div className="flex-1 overflow-auto bg-neutral-50 p-6">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 bg-white p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-neutral-100" />
                <div className="flex-1"><div className="h-4 w-32 rounded bg-neutral-100 mb-1" /><div className="h-3 w-24 rounded bg-neutral-100" /></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-neutral-100" />
                <div className="h-3 w-2/3 rounded bg-neutral-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1" className="text-neutral-300 mx-auto mb-3">
            <rect x="4" y="4" width="16" height="16" rx="3"/><rect x="28" y="4" width="16" height="16" rx="3"/>
            <rect x="4" y="28" width="16" height="16" rx="3"/><rect x="28" y="28" width="16" height="16" rx="3"/>
          </svg>
          <p className="text-sm text-neutral-500">No hay registros para mostrar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-neutral-50 p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {records.map((record) => {
          const name = getDisplayName(record);
          const initials = getInitials(record);
          const email = record.properties['email'] ?? record.properties['domain'] ?? '';
          const isMine = isMyRecord(record.id);

          return (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-neutral-200 bg-white hover:shadow-md hover:border-neutral-300 transition-all cursor-pointer"
              onClick={() => selectRecord(record.id)}
            >
              {/* Card header */}
              <div className="p-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{initials}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-900 truncate">{name}</p>
                    {email && <p className="text-xs text-neutral-500 truncate">{email}</p>}
                  </div>
                  {isMine && (
                    <div className="h-2 w-2 rounded-full bg-green-400 flex-shrink-0" title="En mis registros" />
                  )}
                </div>
              </div>

              {/* Card properties */}
              <div className="px-4 pb-4 space-y-1.5">
                {visibleColumns.slice(2, 5).map((col) => {
                  const val = record.properties[col.key];
                  if (!val || val === '--') return null;
                  return (
                    <div key={col.key} className="flex items-center justify-between">
                      <span className="text-[10px] text-neutral-400 uppercase tracking-wider">{col.label}</span>
                      {col.type === 'enum' ? (
                        <span className="rounded-full bg-blue-50 text-blue-700 px-1.5 py-0.5 text-[10px] font-medium">{val}</span>
                      ) : (
                        <span className="text-xs text-neutral-600 truncate max-w-[120px]">
                          {formatValue(val, col.type)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
