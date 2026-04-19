'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCrmTable } from '../../../application/context/crm-table';
import { useEmailCompose } from '../../../application/context/email/EmailContext';

// ---------------------------------------------------------------------------
// Label types & helpers (mirrored from CrmTableView, kept self-contained)
// ---------------------------------------------------------------------------

type RecordLabel = 'important' | 'common' | null;

const LABEL_CONFIG = {
  important: {
    dotClass: 'bg-red-500',
    badgeClass: 'bg-red-50 text-red-700 border border-red-200',
    text: 'Importante',
  },
  common: {
    dotClass: 'bg-blue-500',
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
    text: 'Cliente',
  },
} as const;

const LABEL_OPTIONS: { value: RecordLabel; text: string; dot?: string }[] = [
  { value: 'important', text: 'Marcar como Importante', dot: 'bg-red-500' },
  { value: 'common',    text: 'Marcar como Cliente',    dot: 'bg-blue-500' },
  { value: null,        text: 'Sin etiqueta' },
];

async function patchLabel(objectType: string, id: string, label: RecordLabel): Promise<void> {
  await fetch(`/api/crm/${objectType}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    // Send plain value — setProperties() on the backend wraps it in { value, source, updatedAt }
    body: JSON.stringify({ properties: { _label: label } }),
  });
}

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

  const { openCompose, openComposeForContact } = useEmailCompose();

  const panelRef = useRef<HTMLDivElement>(null);

  // Label state — initialised from the record's _label property
  const [currentLabel, setCurrentLabel] = useState<RecordLabel>(null);
  const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);
  const [labelBusy, setLabelBusy] = useState(false);
  const labelDropdownRef = useRef<HTMLDivElement>(null);

  // Sync label when selectedRecord changes
  useEffect(() => {
    if (!selectedRecord) return;
    const rawLabel = selectedRecord.properties['_label'];
    // Handle both plain string ('important') and legacy nested format ({ value: 'important' })
    const labelVal = rawLabel && typeof rawLabel === 'object' && 'value' in (rawLabel as object)
      ? (rawLabel as { value: unknown }).value
      : rawLabel;
    setCurrentLabel(labelVal === 'important' || labelVal === 'common' ? (labelVal as RecordLabel) : null);
    setLabelDropdownOpen(false);
  }, [selectedRecord?.id]);

  // Click-outside for label dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (labelDropdownRef.current && !labelDropdownRef.current.contains(e.target as Node)) {
        setLabelDropdownOpen(false);
      }
    }
    if (labelDropdownOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [labelDropdownOpen]);

  const handleLabelSelect = async (label: RecordLabel) => {
    if (!selectedRecord) return;
    setLabelDropdownOpen(false);
    setLabelBusy(true);
    try {
      await patchLabel(state.objectType, selectedRecord.id, label);
      setCurrentLabel(label);
    } finally {
      setLabelBusy(false);
    }
  };

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

                {/* Label badge + dropdown */}
                <div className="relative mt-1.5 flex items-center gap-1.5" ref={labelDropdownRef}>
                  {currentLabel ? (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${LABEL_CONFIG[currentLabel].badgeClass}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${LABEL_CONFIG[currentLabel].dotClass}`} />
                      {LABEL_CONFIG[currentLabel].text}
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-400">Sin etiqueta</span>
                  )}
                  <button
                    onClick={() => setLabelDropdownOpen(!labelDropdownOpen)}
                    disabled={labelBusy}
                    title="Cambiar etiqueta"
                    className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors disabled:opacity-40"
                  >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 4h1.5L6 1.5 8.5 4H10a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/>
                      <circle cx="6" cy="6.5" r="1"/>
                    </svg>
                  </button>
                  <AnimatePresence>
                    {labelDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 top-full mt-1 z-[80] w-52 rounded-lg border border-neutral-200 bg-white shadow-xl py-1"
                      >
                        {LABEL_OPTIONS.map((opt) => (
                          <button
                            key={String(opt.value)}
                            onClick={() => handleLabelSelect(opt.value)}
                            className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-left transition-colors hover:bg-neutral-50 ${
                              currentLabel === opt.value ? 'font-semibold text-neutral-900' : 'text-neutral-700'
                            }`}
                          >
                            {opt.dot
                              ? <span className={`h-2 w-2 rounded-full flex-shrink-0 ${opt.dot}`} />
                              : <span className="h-2 w-2 rounded-full flex-shrink-0 border border-neutral-300" />
                            }
                            {opt.text}
                            {currentLabel === opt.value && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto text-primary-500"><path d="M2 5l2.5 2.5 3.5-4"/></svg>
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-5 py-4 border-b border-neutral-100 space-y-2">
            {/* Send email */}
            {email && (
              <button
                onClick={() => {
                  const objectType = state.objectType;
                  const recordId = selectedRecord.id;
                  const isContact = objectType === 'contacts';
                  const isDeal    = objectType === 'deals';
                  selectRecord(null);
                  if (isContact) {
                    openComposeForContact(email, displayName, recordId);
                    return;
                  }
                  if (isDeal) {
                    openComposeForContact(email, displayName, undefined, recordId);
                    return;
                  }
                  openCompose({ to: email, subject: `Hola ${displayName}` });
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

          {/* Properties + Email activity */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {(state.objectType === 'contacts' || state.objectType === 'deals') && (
              <EmailActivitySection
                contactId={state.objectType === 'contacts' ? selectedRecord.id : undefined}
                dealId={state.objectType === 'deals' ? selectedRecord.id : undefined}
              />
            )}
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

// ---------------------------------------------------------------------------
// Email Activity — sent messages + tracking stats for the selected record
// ---------------------------------------------------------------------------

interface SentMessageRow {
  id: string;
  toEmail: string;
  subject: string | null;
  sentAt: string;
  firstOpenedAt: string | null;
  openCount: number;
  firstReplyAt: string | null;
}

function EmailActivitySection({ contactId, dealId }: { contactId?: string; dealId?: string }) {
  const [items, setItems] = useState<SentMessageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (contactId) qs.set('contactId', contactId);
        if (dealId)    qs.set('dealId',    dealId);
        const res = await fetch(`/api/gmail/sent?${qs.toString()}`, { cache: 'no-store' });
        if (!res.ok) { if (!cancelled) setItems([]); return; }
        const json = await res.json();
        if (!cancelled) setItems(json.items ?? []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contactId, dealId]);

  if (loading) {
    return (
      <div className="mb-6">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3">Actividad de correo</h3>
        <div className="space-y-2">
          <div className="h-12 rounded-lg bg-neutral-100 animate-pulse" />
          <div className="h-12 rounded-lg bg-neutral-100 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3">
        Actividad de correo {items.length > 0 && <span className="text-neutral-300">· {items.length}</span>}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-neutral-400">Sin correos enviados desde Suple.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((m) => {
            const sent = new Date(m.sentAt);
            const replyMs = m.firstReplyAt ? new Date(m.firstReplyAt).getTime() - sent.getTime() : null;
            const replyHours = replyMs !== null ? Math.round(replyMs / 3_600_000 * 10) / 10 : null;
            return (
              <li key={m.id} className="rounded-lg border border-neutral-100 px-3 py-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-neutral-800 truncate">{m.subject || '(Sin asunto)'}</span>
                  <span className="text-[10px] text-neutral-400 flex-shrink-0" suppressHydrationWarning>
                    {sent.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 truncate mt-0.5">Para: {m.toEmail}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {m.firstOpenedAt ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 text-[10px] font-semibold">
                      Abierto {m.openCount > 1 ? `${m.openCount}x` : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-50 text-neutral-500 border border-neutral-200 px-2 py-0.5 text-[10px]">
                      No abierto
                    </span>
                  )}
                  {m.firstReplyAt ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold">
                      Respondido{replyHours !== null ? ` · ${replyHours}h` : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-50 text-neutral-500 border border-neutral-200 px-2 py-0.5 text-[10px]">
                      Sin respuesta
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
