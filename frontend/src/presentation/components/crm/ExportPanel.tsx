'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCrmTable } from '../../../application/context/crm-table';
import type { ExportFormat, ExportStatus } from '../../../application/context/crm-table/types';

/**
 * ==========================================================================
 * Export Panel
 * ==========================================================================
 *
 * Async export workflow:
 *   1. User picks format (CSV / XLSX / JSON)
 *   2. Frontend captures current state (filters, sort, visible columns)
 *   3. POST /api/crm/export creates an async job on backend
 *   4. Frontend tracks job status (pending → processing → completed)
 *   5. Download link appears when ready
 *
 * Non-blocking: export runs in background, user can continue working.
 * ==========================================================================
 */

const FORMAT_OPTIONS: { value: ExportFormat; label: string; icon: string; description: string }[] = [
  { value: 'csv', label: 'CSV', icon: '📄', description: 'Archivo separado por comas' },
  { value: 'xlsx', label: 'Excel', icon: '📊', description: 'Libro de Microsoft Excel' },
  { value: 'json', label: 'JSON', icon: '{ }', description: 'Formato JSON estructurado' },
];

const STATUS_CONFIG: Record<ExportStatus, { color: string; label: string }> = {
  pending: { color: 'bg-yellow-100 text-yellow-700', label: 'En cola' },
  processing: { color: 'bg-blue-100 text-blue-700', label: 'Procesando' },
  completed: { color: 'bg-green-100 text-green-700', label: 'Completado' },
  failed: { color: 'bg-red-100 text-red-700', label: 'Error' },
};

export default function ExportPanel() {
  const { state, dispatch, requestExport } = useCrmTable();

  return (
    <AnimatePresence>
      {state.showExportPanel && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="absolute right-4 top-2 z-50 w-96 rounded-lg border border-neutral-200 bg-white shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-neutral-800">Exportar datos</h3>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_EXPORT_PANEL' })}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3l8 8M11 3l-8 8"/>
              </svg>
            </button>
          </div>

          {/* Export info */}
          <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
            <div className="flex items-center justify-between text-xs text-neutral-600">
              <span>{state.pagination.total} registros</span>
              <span>{state.columns.filter((c) => c.visible).length} columnas</span>
              <span>{state.activeFilterCount} filtros activos</span>
            </div>
          </div>

          {/* Format selection */}
          <div className="px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-neutral-600 mb-2">Seleccionar formato</p>
            {FORMAT_OPTIONS.map((fmt) => (
              <button
                key={fmt.value}
                onClick={() => requestExport(fmt.value)}
                className="flex items-center gap-3 w-full rounded-md border border-neutral-200 px-3 py-2.5 text-left hover:border-primary-300 hover:bg-primary-50 transition-colors group"
              >
                <span className="text-lg">{fmt.icon}</span>
                <div className="flex-1">
                  <span className="text-sm font-medium text-neutral-800 group-hover:text-primary-700">{fmt.label}</span>
                  <p className="text-[11px] text-neutral-400">{fmt.description}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-400 group-hover:text-primary-500">
                  <path d="M7 2v8M4 7l3 3 3-3M3 12h8"/>
                </svg>
              </button>
            ))}
          </div>

          {/* Recent exports */}
          {state.exportJobs.length > 0 && (
            <div className="border-t border-neutral-100 px-4 py-3">
              <p className="text-xs font-semibold text-neutral-600 mb-2">Exportaciones recientes</p>
              <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                {state.exportJobs.map((job) => {
                  const statusCfg = STATUS_CONFIG[job.status];
                  return (
                    <div key={job.id} className="flex items-center justify-between rounded-md border border-neutral-100 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                        <span className="text-xs text-neutral-600 uppercase">{job.format}</span>
                        <span className="text-[10px] text-neutral-400">{job.totalRecords} registros</span>
                      </div>
                      {job.status === 'completed' && job.downloadUrl && (
                        <a
                          href={job.downloadUrl}
                          download
                          className="text-xs text-primary-600 font-medium hover:text-primary-700"
                        >
                          Descargar
                        </a>
                      )}
                      {job.status === 'processing' && (
                        <div className="h-3 w-3 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
