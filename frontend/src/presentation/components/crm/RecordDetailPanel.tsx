'use client';

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCrmTable } from '../../../application/context/crm-table';
import { useEmailCompose } from '../../../application/context/email/EmailContext';

/**
 * ==========================================================================
 * Record Detail Panel — Slide-in from right
 * ==========================================================================
 *
 * Opens when clicking a record name in the table or card view.
 * Shows:
 *   - Avatar + display name
 *   - Key properties (email, phone, domain, etc.)
 *   - Actions: Mandar correo, Agregar/Quitar de mis [tipo], Analizar
 * ==========================================================================
 */

export default function RecordDetailPanel() {
  const {
    state,
    selectedRecord,
    selectRecord,
    isMyRecord,
    addToMyRecords,
    removeFromMyRecords,
  } = useCrmTable();

  const { openCompose } = useEmailCompose();

  const panelRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        selectRecord(null);
      }
    }
    if (selectedRecord) {
      // Delay to avoid immediate close from the same click
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClick);
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClick);
      };
    }
  }, [selectedRecord, selectRecord]);

  // ESC to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') selectRecord(null);
    }
    if (selectedRecord) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [selectedRecord, selectRecord]);

  if (!selectedRecord) return null;

  const isContact = state.objectType === 'contacts';
  const objectLabel = isContact ? 'contactos' : 'empresas';
  const isMine = isMyRecord(selectedRecord.id);

  // Build display values
  const displayName = isContact
    ? `${selectedRecord.properties['first_name'] ?? ''} ${selectedRecord.properties['last_name'] ?? ''}`.trim() || selectedRecord.properties['email'] || 'Sin nombre'
    : selectedRecord.properties['name'] || 'Sin nombre';

  const initials = isContact
    ? ((selectedRecord.properties['first_name']?.[0] ?? '') + (selectedRecord.properties['last_name']?.[0] ?? '')).toUpperCase() || selectedRecord.properties['email']?.[0]?.toUpperCase() || '?'
    : selectedRecord.properties['name']?.[0]?.toUpperCase() ?? '?';

  const rawEmail = selectedRecord.properties['email'] ?? '';
  const domain   = selectedRecord.properties['domain'] ?? '';
  // For companies without a direct email, derive info@domain as fallback
  const email    = rawEmail || (domain ? `info@${domain}` : '');
  const phone    = selectedRecord.properties['phone'] ?? '';
  const city = selectedRecord.properties['city'] ?? '';
  const leadStatus = selectedRecord.properties['lead_status'] ?? '';
  const createDate = selectedRecord.properties['create_date'] ?? '';
  const lastActivity = selectedRecord.properties['last_activity'] ?? '';

  const formatDate = (iso: string) => {
    if (!iso) return '--';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return iso; }
  };

  // Properties to display
  const props = [
    ...(email ? [{ label: 'Correo', value: email, type: 'email' }] : []),
    ...(phone ? [{ label: 'Teléfono', value: phone, type: 'text' }] : []),
    ...(domain ? [{ label: 'Dominio', value: domain, type: 'url' }] : []),
    ...(city ? [{ label: 'Ciudad', value: city, type: 'text' }] : []),
    ...(leadStatus ? [{ label: 'Estado del lead', value: leadStatus, type: 'enum' }] : []),
    { label: 'Fecha de creación', value: formatDate(createDate), type: 'text' },
    { label: 'Última actividad', value: formatDate(lastActivity), type: 'text' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        key="record-detail-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/20"
      >
        <motion.div
          ref={panelRef}
          key="record-detail-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="absolute right-0 top-0 h-full w-[420px] bg-white shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Detalle de {isContact ? 'contacto' : 'empresa'}
            </span>
            <button
              onClick={() => selectRecord(null)}
              className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4l8 8M12 4l-8 8"/>
              </svg>
            </button>
          </div>

          {/* Profile section */}
          <div className="px-5 py-6 border-b border-neutral-100">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="h-16 w-16 flex-shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-md">
                <span className="text-xl font-bold text-white">{initials}</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-neutral-900 truncate">{displayName}</h2>
                {email && (
                  <p className="text-sm text-neutral-500 truncate">{email}</p>
                )}
                {domain && !email && (
                  <p className="text-sm text-neutral-500 truncate">{domain}</p>
                )}
                {/* My record badge */}
                {isMine && (
                  <span className="inline-flex items-center gap-1 mt-1.5 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1.5 4l2 2 3-3.5"/></svg>
                    En mis {objectLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-5 py-4 border-b border-neutral-100 space-y-2">
            {/* Send email */}
            {email && (
              <button
                onClick={() => {
                  selectRecord(null);
                  openCompose({
                    to: email,
                    subject: `Hola ${displayName}`,
                  });
                }}
                className="flex items-center gap-3 w-full rounded-lg border border-neutral-200 px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#3B82F6" strokeWidth="1.3">
                    <rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M1 4.5l7 4.5 7-4.5"/>
                  </svg>
                </div>
                <div className="text-left">
                  <span className="font-medium">Mandar correo</span>
                  <p className="text-xs text-neutral-400 mt-0.5">{email}</p>
                </div>
              </button>
            )}

            {/* Add / Remove from my records */}
            <button
              onClick={() => {
                if (isMine) {
                  removeFromMyRecords(selectedRecord.id);
                } else {
                  addToMyRecords(selectedRecord.id);
                }
              }}
              className={`flex items-center gap-3 w-full rounded-lg border px-4 py-3 text-sm transition-colors ${
                isMine
                  ? 'border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300'
                  : 'border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300'
              }`}
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isMine ? 'bg-red-50' : 'bg-green-50'
              }`}>
                {isMine ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#DC2626" strokeWidth="1.5">
                    <path d="M12 8H4"/>
                    <circle cx="8" cy="8" r="6"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#16A34A" strokeWidth="1.5">
                    <path d="M8 4v8M4 8h8"/>
                    <circle cx="8" cy="8" r="6"/>
                  </svg>
                )}
              </div>
              <div className="text-left">
                <span className="font-medium">
                  {isMine ? `Quitar de mis ${objectLabel}` : `Agregar a mis ${objectLabel}`}
                </span>
                <p className="text-xs opacity-60 mt-0.5">
                  {isMine ? 'Ya no aparecerá en tu vista personalizada' : `Aparecerá en la pestaña "Mis ${objectLabel}"`}
                </p>
              </div>
            </button>

            {/* Analyze */}
            <button
              className="flex items-center gap-3 w-full rounded-lg border border-purple-200 px-4 py-3 text-sm text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#7C3AED" strokeWidth="1.3">
                  <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l4 4"/>
                  <path d="M5 6.5h3M6.5 5v3"/>
                </svg>
              </div>
              <div className="text-left">
                <span className="font-medium">Analizar</span>
                <p className="text-xs opacity-60 mt-0.5">Análisis avanzado con IA</p>
              </div>
            </button>
          </div>

          {/* Properties */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3">Propiedades</h3>
            <div className="space-y-3">
              {props.map((p) => (
                <div key={p.label} className="flex items-start justify-between gap-3">
                  <span className="text-xs text-neutral-400 flex-shrink-0 w-32 pt-0.5">{p.label}</span>
                  {p.type === 'email' ? (
                    <a href={`mailto:${p.value}`} className="text-sm text-primary-600 hover:underline truncate flex-1 text-right">
                      {p.value}
                    </a>
                  ) : p.type === 'url' ? (
                    <a href={`https://${p.value}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline truncate flex-1 text-right">
                      {p.value}
                    </a>
                  ) : p.type === 'enum' && p.value ? (
                    <span className="inline-flex rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[11px] font-medium">
                      {p.value}
                    </span>
                  ) : (
                    <span className="text-sm text-neutral-700 truncate flex-1 text-right">{p.value || '--'}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-neutral-100 px-5 py-3 flex items-center justify-between">
            <span className="text-[10px] text-neutral-400">
              ID: {selectedRecord.id}
            </span>
            <button
              onClick={() => selectRecord(null)}
              className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
