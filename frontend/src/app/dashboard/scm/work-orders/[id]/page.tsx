'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import TopBar from '../../../../../presentation/components/layout/TopBar';
import CuttingPlanViewer from '../../../../../presentation/components/scm/CuttingPlanViewer';
import {
  pageTransition,
  staggerContainer,
  staggerItem,
} from '../../../../../presentation/animations/variants';
import type { WorkOrder, WorkOrderStatus, PlannedOffcut } from '../../../../../types/scm';

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

interface BadgeConfig {
  bg: string;
  text: string;
  label: string;
  pulse?: boolean;
}

const STATUS_BADGE: Record<WorkOrderStatus, BadgeConfig> = {
  PENDING:    { bg: 'bg-neutral-100', text: 'text-neutral-600', label: 'Pendiente' },
  OPTIMIZING: { bg: 'bg-blue-50',    text: 'text-blue-700',    label: 'Optimizando', pulse: true },
  CUTTING:    { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'Cortando' },
  COMPLETED:  { bg: 'bg-green-50',   text: 'text-green-700',   label: 'Completado' },
  CANCELLED:  { bg: 'bg-red-50',     text: 'text-red-500',     label: 'Cancelado' },
};

const STATUS_ICON: Record<WorkOrderStatus, React.ReactNode> = {
  PENDING: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="5.5" />
      <path d="M7 4.5V7l1.5 1.5" />
    </svg>
  ),
  OPTIMIZING: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M7 1.5a5.5 5.5 0 1 1-3.89 1.61" />
      <path d="M7 1.5V4M7 1.5H4.5" />
    </svg>
  ),
  CUTTING: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12L9 5M9 5a2 2 0 1 0 2.8-2.8L9 5zm-5 5a2 2 0 1 1-1.8 1.8" />
    </svg>
  ),
  COMPLETED: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="5.5" />
      <path d="M4.5 7l2 2 3-3" />
    </svg>
  ),
  CANCELLED: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="7" r="5.5" />
      <path d="M9 5L5 9M5 5l4 4" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: WorkOrderStatus }) {
  const cfg = STATUS_BADGE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}
    >
      {cfg.pulse ? (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
        </span>
      ) : null}
      {cfg.label}
    </span>
  );
}

function OptimizeButton({
  onClick,
  isLoading,
  size = 'sm',
}: {
  onClick: () => void;
  isLoading: boolean;
  size?: 'sm' | 'md';
}) {
  const padding = size === 'md' ? 'px-6 py-2.5 text-sm' : 'px-4 py-2 text-xs';
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`inline-flex items-center gap-2 rounded-lg bg-primary-500 font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60 ${padding}`}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M7 1.5a5.5 5.5 0 1 1-3.89 1.61" />
          <path d="M7 1.5V4M7 1.5H4.5" />
        </svg>
      )}
      {isLoading ? 'Optimizando...' : 'Optimizar Corte'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Modal animation variants
// ---------------------------------------------------------------------------

const modalOverlayVariants = {
  hidden:   { opacity: 0 },
  visible:  { opacity: 1, transition: { duration: 0.18 } },
  exit:     { opacity: 0, transition: { duration: 0.15 } },
};

const modalCardVariants = {
  hidden:   { opacity: 0, scale: 0.96, y: 8 },
  visible:  { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
  exit:     { opacity: 0, scale: 0.96, y: 4, transition: { duration: 0.15 } },
};

// ---------------------------------------------------------------------------
// OffcutsModal
// ---------------------------------------------------------------------------

interface OffcutsModalOffcut extends PlannedOffcut {
  /** The boardId the offcut came from, for traceability */
  sourceBoardId?: string;
}

interface OffcutsModalProps {
  workOrderId: string;
  offcuts: OffcutsModalOffcut[];
  onClose: () => void;
  onSaved: (count: number) => void;
}

function OffcutsModal({ workOrderId, offcuts, onClose, onSaved }: OffcutsModalProps) {
  const [selected, setSelected] = useState<boolean[]>(() => offcuts.map(() => true));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const toggleAll = (checked: boolean) => setSelected(offcuts.map(() => checked));
  const toggle = (i: number) => setSelected((prev) => prev.map((v, idx) => idx === i ? !v : v));
  const selectedCount = selected.filter(Boolean).length;

  const handleSave = async () => {
    const toSave = offcuts.filter((_, i) => selected[i]);
    if (toSave.length === 0) { onClose(); return; }

    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/scm/work-orders/${workOrderId}/confirm-offcuts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offcuts: toSave.map((o) => ({
            widthMm:      o.widthMm,
            heightMm:     o.heightMm,
            thicknessMm:  o.thicknessMm,
            materialSku:  o.materialSku,
            sourceBoardId: o.sourceBoardId,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `Error ${res.status}`);
      }
      const data: { saved: number } = await res.json();
      onSaved(data.saved ?? toSave.length);
    } catch (err) {
      setSaveError((err as Error).message ?? 'Error al guardar retazos');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="offcuts-overlay"
        variants={modalOverlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          key="offcuts-card"
          variants={modalCardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-600">
                  <rect x="2" y="2" width="12" height="12" rx="2" />
                  <path d="M5 8h6M5 5h6M5 11h3" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-neutral-800">Guardar retazos al inventario</h2>
                <p className="text-xs text-neutral-400">{offcuts.length} retazo{offcuts.length !== 1 ? 's' : ''} generado{offcuts.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M11 3L3 11M3 3l8 8" />
              </svg>
            </button>
          </div>

          {/* Select-all row */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-2.5 bg-neutral-50">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-primary-500 cursor-pointer"
                checked={selectedCount === offcuts.length}
                ref={(el) => { if (el) el.indeterminate = selectedCount > 0 && selectedCount < offcuts.length; }}
                onChange={(e) => toggleAll(e.target.checked)}
              />
              <span className="text-xs font-medium text-neutral-600">Seleccionar todos</span>
            </label>
            <span className="text-xs text-neutral-400">{selectedCount} de {offcuts.length} seleccionados</span>
          </div>

          {/* Offcut list */}
          <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100 px-5">
            {offcuts.map((offcut, i) => (
              <label
                key={i}
                className="flex items-center gap-3 py-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 flex-shrink-0 accent-primary-500 cursor-pointer"
                  checked={selected[i]}
                  onChange={() => toggle(i)}
                />
                <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-neutral-700 truncate">
                      <span className="font-mono">{offcut.widthMm} × {offcut.heightMm} mm</span>
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {offcut.materialSku}
                      {offcut.thicknessMm ? ` · ${offcut.thicknessMm} mm esp.` : ''}
                    </p>
                  </div>
                  {/* Area chip */}
                  <span className="flex-shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                    {((offcut.widthMm * offcut.heightMm) / 1_000_000).toFixed(3)} m²
                  </span>
                </div>
              </label>
            ))}
          </div>

          {/* Error */}
          {saveError && (
            <div className="mx-5 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-xs text-red-600">{saveError}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-4 gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-700 transition-colors disabled:opacity-50"
            >
              Descartar todos
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || selectedCount === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 3L4.5 8.5 2 6" />
                  </svg>
                  Guardar seleccionados ({selectedCount})
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Toast notification
// ---------------------------------------------------------------------------

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <AnimatePresence>
      <motion.div
        key="toast"
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.22 } }}
        exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
        className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 shadow-lg"
      >
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
            <path d="M10 3L4.5 8.5 2 6" />
          </svg>
        </div>
        <p className="text-sm font-medium text-green-800">{message}</p>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left col */}
      <div className="space-y-4 lg:col-span-1">
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-5 animate-pulse space-y-3">
          <div className="h-4 w-40 rounded bg-neutral-100" />
          <div className="space-y-2">
            <div className="h-14 rounded-lg bg-neutral-100" />
            <div className="h-14 rounded-lg bg-neutral-100" />
            <div className="h-14 rounded-lg bg-neutral-100" />
          </div>
          <div className="h-3 w-28 rounded bg-neutral-100" />
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-5 animate-pulse space-y-3">
          <div className="h-4 w-24 rounded bg-neutral-100" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-neutral-100" />
            <div className="h-3 w-3/4 rounded bg-neutral-100" />
            <div className="h-3 w-1/2 rounded bg-neutral-100" />
          </div>
        </div>
      </div>

      {/* Right col */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-5 animate-pulse space-y-4">
          <div className="h-5 w-48 rounded bg-neutral-100" />
          <div className="h-64 rounded-lg bg-neutral-100" />
          <div className="grid grid-cols-4 gap-3">
            <div className="h-20 rounded-lg bg-neutral-100" />
            <div className="h-20 rounded-lg bg-neutral-100" />
            <div className="h-20 rounded-lg bg-neutral-100" />
            <div className="h-20 rounded-lg bg-neutral-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right-panel states
// ---------------------------------------------------------------------------

function OptimizingPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white shadow-sm py-24 px-8 text-center"
    >
      {/* Spinning SVG circle */}
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
        <svg
          className="animate-spin h-20 w-20 text-blue-400"
          viewBox="0 0 80 80"
          fill="none"
        >
          <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="4" strokeOpacity="0.15" />
          <path
            d="M40 6a34 34 0 0 1 34 34"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-blue-500">
            <rect x="3" y="3" width="22" height="22" rx="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 14h4l2-4 2 8 2-4h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-neutral-800">Optimizando...</h3>
      <p className="mt-2 text-sm text-neutral-500 max-w-xs">
        El motor de corte está calculando el trazado óptimo
      </p>

      {/* Pulsing dots */}
      <div className="mt-6 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-blue-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.3,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function PendingPanel({ onOptimize, isOptimizing }: { onOptimize: () => void; isOptimizing: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 py-24 px-8 text-center"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100">
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-neutral-400"
        >
          <rect x="3" y="3" width="22" height="22" rx="3" />
          <path d="M9 9h10M9 14h10M9 19h6" />
          <circle cx="22" cy="22" r="5" fill="white" stroke="currentColor" />
          <path d="M22 19.5v5M19.5 22h5" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-neutral-700">Sin plan de corte</h3>
      <p className="mt-1 text-xs text-neutral-400 max-w-xs">
        Ejecuta la optimización para generar el trazado
      </p>
      <div className="mt-6">
        <OptimizeButton onClick={onOptimize} isLoading={isOptimizing} size="md" />
      </div>
    </motion.div>
  );
}

function CancelledPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4"
      role="alert"
    >
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-100">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="text-red-500"
        >
          <circle cx="8" cy="8" r="6.5" />
          <path d="M10 6L6 10M6 6l4 4" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-red-700">Orden cancelada</p>
        <p className="mt-0.5 text-xs text-red-500">
          Esta orden de trabajo fue cancelada y no puede ser procesada.
        </p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function WorkOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Offcuts confirmation modal
  const [pendingOffcuts, setPendingOffcuts] = useState<Array<PlannedOffcut & { sourceBoardId?: string }> | null>(null);
  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Keep a ref to the auto-refresh interval so we can clear it
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchWorkOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/scm/work-orders/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: WorkOrder = await res.json();
      setWorkOrder(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message ?? 'No se pudo cargar la orden');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Initial fetch
  useEffect(() => {
    fetchWorkOrder();
  }, [fetchWorkOrder]);

  // Auto-refresh every 5 s while in a live state
  useEffect(() => {
    const status = workOrder?.status;
    const isLive = status === 'OPTIMIZING' || status === 'CUTTING';

    if (isLive) {
      intervalRef.current = setInterval(fetchWorkOrder, 5_000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [workOrder?.status, fetchWorkOrder]);

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const res = await fetch(`/api/scm/work-orders/${id}/optimize`, { method: 'POST' });
      const updated: WorkOrder | null = res.ok ? await res.json().catch(() => null) : null;
      await fetchWorkOrder();

      // Collect all PlannedOffcuts from the cutting plan returned by the optimize call
      if (updated?.cuttingPlan?.boardAllocations) {
        const allOffcuts: Array<PlannedOffcut & { sourceBoardId?: string }> = [];
        for (const allocation of updated.cuttingPlan.boardAllocations) {
          for (const offcut of allocation.offcuts ?? []) {
            if (offcut.widthMm > 0 && offcut.heightMm > 0) {
              allOffcuts.push({ ...offcut, sourceBoardId: allocation.stockId });
            }
          }
        }
        if (allOffcuts.length > 0) {
          setPendingOffcuts(allOffcuts);
        }
      }
    } catch {
      // ignore, just refetch
      await fetchWorkOrder();
    } finally {
      setIsOptimizing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const totalPieces = workOrder?.requirements.reduce((acc, r) => acc + r.quantity, 0) ?? 0;
  const materialTypes = workOrder
    ? new Set(workOrder.requirements.map((r) => r.materialSku)).size
    : 0;

  // ---------------------------------------------------------------------------
  // Render: error
  // ---------------------------------------------------------------------------

  if (!isLoading && error) {
    return (
      <>
        <TopBar
          title="Detalle de Orden"
          subtitle="Optimización de corte y trazado de materiales"
        />
        <div className="flex flex-col items-center justify-center py-32 text-center p-8">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="text-red-400"
            >
              <circle cx="14" cy="14" r="11" />
              <path d="M14 9v6M14 18.5v.5" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-neutral-700">No se pudo cargar la orden</p>
          <p className="mt-1 text-xs text-neutral-400">{error}</p>
          <button
            onClick={() => { setIsLoading(true); setError(null); fetchWorkOrder(); }}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50"
          >
            Reintentar
          </button>
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: main
  // ---------------------------------------------------------------------------

  return (
    <>
      <TopBar
        title="Detalle de Orden"
        subtitle="Optimización de corte y trazado de materiales"
      />

      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        className="p-4 sm:p-6 lg:p-8"
      >
        {/* ── Header row ── */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {/* Back button */}
          <button
            onClick={() => router.push('/dashboard/scm/work-orders')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 hover:text-neutral-800"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 3L5 7l4 4" />
            </svg>
            Órdenes
          </button>

          {/* Order ID */}
          {workOrder && (() => {
            // Extract trailing digit-group so seed IDs like `wo_pending_007`
            // render as `#0007` instead of `NDING_007`.
            const match = workOrder.id.match(/(\d+)$/);
            const displayId = match
              ? String(parseInt(match[1], 10)).padStart(4, '0')
              : workOrder.id.slice(-8).toUpperCase();
            return (
              <span className="font-mono text-sm font-semibold text-neutral-700 tracking-wide">
                #{displayId}
              </span>
            );
          })()}

          {/* Status badge */}
          {workOrder && <StatusBadge status={workOrder.status} />}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Optimize button (header) */}
          {workOrder?.status === 'PENDING' && (
            <OptimizeButton onClick={handleOptimize} isLoading={isOptimizing} size="sm" />
          )}
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <DetailSkeleton />
        ) : workOrder ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* ── Left column ── */}
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-5 lg:col-span-1"
            >
              {/* Requirements card */}
              <motion.div
                variants={staggerItem}
                className="rounded-xl border border-neutral-200 bg-white shadow-sm"
              >
                <div className="border-b border-neutral-100 px-5 py-3">
                  <h2 className="text-sm font-semibold text-neutral-800">
                    Requerimientos de Corte
                  </h2>
                </div>
                <div className="p-5 space-y-3">
                  {workOrder.requirements.length === 0 ? (
                    <p className="text-xs text-neutral-400">Sin requerimientos registrados.</p>
                  ) : (
                    workOrder.requirements.map((req) => (
                      <div
                        key={req.pieceId}
                        className="rounded-lg border border-neutral-100 bg-neutral-50 px-3.5 py-3 space-y-1.5"
                      >
                        {/* Material SKU badge */}
                        <div className="flex items-center justify-between">
                          <span className="inline-flex rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-700">
                            {req.materialSku}
                          </span>
                          <span className="text-[11px] font-semibold text-neutral-600">
                            ×{req.quantity}
                          </span>
                        </div>

                        {/* Label */}
                        {req.label && (
                          <p className="text-xs font-medium text-neutral-700 truncate">
                            {req.label}
                          </p>
                        )}

                        {/* Dimensions + thickness */}
                        <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                          <span className="font-mono">
                            {req.widthMm} × {req.heightMm} mm
                          </span>
                          <span className="text-neutral-300">·</span>
                          <span>{req.thicknessMm} mm esp.</span>
                        </div>

                        {/* Rotation chip */}
                        <div>
                          {req.allowRotation ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                              <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <path d="M4.5 1a3.5 3.5 0 1 1-2.48 1.02" />
                                <path d="M4.5 1V3M4.5 1H2.5" />
                              </svg>
                              Rotación permitida
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                              Sin rotación
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Summary */}
                  {workOrder.requirements.length > 0 && (
                    <p className="pt-1 text-[11px] text-neutral-400">
                      Total: <span className="font-semibold text-neutral-600">{totalPieces} pieza{totalPieces !== 1 ? 's' : ''}</span>
                      {', '}
                      <span className="font-semibold text-neutral-600">{materialTypes} tipo{materialTypes !== 1 ? 's' : ''} de material</span>
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Info card */}
              <motion.div
                variants={staggerItem}
                className="rounded-xl border border-neutral-200 bg-white shadow-sm"
              >
                <div className="border-b border-neutral-100 px-5 py-3">
                  <h2 className="text-sm font-semibold text-neutral-800">Información</h2>
                </div>
                <div className="p-5 space-y-3 text-xs text-neutral-600">
                  {/* Created */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-neutral-400">Creado</span>
                    <span className="font-medium text-right">
                      {new Date(workOrder.createdAt).toLocaleString('es-CL', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>

                  {/* Updated */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-neutral-400">Actualizado</span>
                    <span className="font-medium text-right">
                      {new Date(workOrder.updatedAt).toLocaleString('es-CL', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>

                  {/* Status with icon */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-neutral-400">Estado</span>
                    <span
                      className={`inline-flex items-center gap-1.5 font-semibold ${STATUS_BADGE[workOrder.status].text}`}
                    >
                      {STATUS_ICON[workOrder.status]}
                      {STATUS_BADGE[workOrder.status].label}
                    </span>
                  </div>

                  {/* Full ID */}
                  <div className="pt-1 border-t border-neutral-100">
                    <p className="text-neutral-400 mb-1">ID completo</p>
                    <p className="font-mono text-[10px] text-neutral-500 break-all leading-relaxed">
                      {workOrder.id}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* ── Right column ── */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {/* COMPLETED + plan */}
                {workOrder.status === 'COMPLETED' && workOrder.cuttingPlan ? (
                  <motion.div
                    key="completed-plan"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <CuttingPlanViewer plan={workOrder.cuttingPlan} />
                  </motion.div>
                ) : workOrder.status === 'OPTIMIZING' ? (
                  <motion.div key="optimizing" exit={{ opacity: 0 }}>
                    <OptimizingPanel />
                  </motion.div>
                ) : workOrder.status === 'PENDING' ? (
                  <motion.div key="pending" exit={{ opacity: 0 }}>
                    <PendingPanel onOptimize={handleOptimize} isOptimizing={isOptimizing} />
                  </motion.div>
                ) : workOrder.status === 'CANCELLED' ? (
                  <motion.div key="cancelled" exit={{ opacity: 0 }}>
                    <CancelledPanel />
                  </motion.div>
                ) : (
                  /* CUTTING — show a simple info panel */
                  <motion.div
                    key="cutting"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-amber-600"
                        >
                          <path d="M2 16L11 7M11 7a3 3 0 1 0 4-4L11 7zM7 13a3 3 0 1 1-2.5 2.5" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-800">Orden en proceso de corte</p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          El plan de corte está siendo ejecutado. La página se actualizará automáticamente.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : null}
      </motion.div>

      {/* Offcuts confirmation modal */}
      {pendingOffcuts && pendingOffcuts.length > 0 && (
        <OffcutsModal
          workOrderId={id}
          offcuts={pendingOffcuts}
          onClose={() => setPendingOffcuts(null)}
          onSaved={(count) => {
            setPendingOffcuts(null);
            setToastMessage(`${count} retazo${count !== 1 ? 's' : ''} guardado${count !== 1 ? 's' : ''} al inventario`);
          }}
        />
      )}

      {/* Toast */}
      {toastMessage && (
        <Toast message={toastMessage} onDone={() => setToastMessage(null)} />
      )}
    </>
  );
}
