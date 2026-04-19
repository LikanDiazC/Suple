'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import TopBar from '../../../../presentation/components/layout/TopBar';
import InventoryGrid from '../../../../presentation/components/scm/InventoryGrid';
import { pageTransition } from '../../../../presentation/animations/variants';
import type { Board, Offcut, InventoryResponse } from '../../../../types/scm';

// ─────────────────────────────────────────────────────────────────────────────
// Filter state
// ─────────────────────────────────────────────────────────────────────────────

interface FilterState {
  materialSku: string;
  status: string; // '' = All, 'AVAILABLE', 'RESERVED', 'CONSUMED'
}

// ─────────────────────────────────────────────────────────────────────────────
// "Agregar Plancha" modal form state
// ─────────────────────────────────────────────────────────────────────────────

const MATERIAL_OPTIONS = ['MDF', 'MDP', 'Plywood', 'OSB', 'Melamina', 'Otro'] as const;

interface AddBoardForm {
  material: string;
  widthMm: string;
  heightMm: string;
  thicknessMm: string;
  quantity: string;
  supplier: string;
  costPerUnit: string;
}

const DEFAULT_ADD_FORM: AddBoardForm = {
  material: 'MDF',
  widthMm: '2440',
  heightMm: '1220',
  thicknessMm: '18',
  quantity: '1',
  supplier: '',
  costPerUnit: '',
};

// ─────────────────────────────────────────────────────────────────────────────
// Stock-adjustment modal state
// ─────────────────────────────────────────────────────────────────────────────

interface AdjustForm {
  delta: string;
  reason: string;
}

const DEFAULT_ADJUST_FORM: AdjustForm = { delta: '', reason: '' };

// ─────────────────────────────────────────────────────────────────────────────
// Modal overlay variants
// ─────────────────────────────────────────────────────────────────────────────

const modalOverlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const modalCardVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
  exit: { opacity: 0, scale: 0.96, y: 4, transition: { duration: 0.15 } },
};

// ─────────────────────────────────────────────────────────────────────────────
// Selected item union
// ─────────────────────────────────────────────────────────────────────────────

type SelectedItem =
  | { kind: 'board'; data: Board }
  | { kind: 'offcut'; data: Offcut }
  | null;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function toM2(widthMm: number, heightMm: number): string {
  return (widthMm * heightMm / 1_000_000).toFixed(3);
}

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible',
  RESERVED: 'Reservada',
  CONSUMED: 'Consumida',
  SCRAPPED: 'Descartada',
};

// ─────────────────────────────────────────────────────────────────────────────
// "Agregar Plancha" modal component
// ─────────────────────────────────────────────────────────────────────────────

interface AddBoardModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function AddBoardModal({ onClose, onSuccess }: AddBoardModalProps) {
  const [form, setForm] = useState<AddBoardForm>(DEFAULT_ADD_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLSelectElement>(null);

  // Focus first input on mount
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function setField<K extends keyof AddBoardForm>(key: K, value: AddBoardForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const widthMm = parseInt(form.widthMm, 10);
    const heightMm = parseInt(form.heightMm, 10);
    const thicknessMm = parseInt(form.thicknessMm, 10);
    const quantity = parseInt(form.quantity, 10);

    if (!widthMm || !heightMm || !thicknessMm || !quantity || quantity < 1) {
      setError('Por favor, completa todos los campos requeridos con valores válidos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        material: form.material,
        widthMm,
        heightMm,
        thicknessMm,
        quantity,
      };
      if (form.supplier.trim()) body.supplier = form.supplier.trim();
      if (form.costPerUnit.trim()) body.costPerUnit = parseFloat(form.costPerUnit);

      const res = await fetch('/api/scm/inventory/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? `Error ${res.status}`);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar la plancha.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.div
      key="add-board-overlay"
      variants={modalOverlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-modal="true"
      role="dialog"
      aria-label="Agregar plancha"
    >
      <motion.div
        variants={modalCardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary-50 text-primary-600">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M7 1v12M1 7h12" />
              </svg>
            </span>
            <h2 className="text-sm font-semibold text-neutral-800">Agregar plancha</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Cerrar modal"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 space-y-4">
            {/* Material */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1.5">
                Material <span className="text-red-400">*</span>
              </label>
              <select
                ref={firstInputRef}
                value={form.material}
                onChange={(e) => setField('material', e.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                required
              >
                {MATERIAL_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Dimensions row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1.5">
                  Ancho (mm) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.widthMm}
                  onChange={(e) => setField('widthMm', e.target.value)}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  placeholder="2440"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1.5">
                  Alto (mm) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.heightMm}
                  onChange={(e) => setField('heightMm', e.target.value)}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  placeholder="1220"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1.5">
                  Espesor (mm) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.thicknessMm}
                  onChange={(e) => setField('thicknessMm', e.target.value)}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  placeholder="18"
                  required
                />
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1.5">
                Cantidad <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setField('quantity', e.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                placeholder="1"
                required
              />
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1.5">
                  Proveedor
                </label>
                <input
                  type="text"
                  value={form.supplier}
                  onChange={(e) => setField('supplier', e.target.value)}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 placeholder-neutral-400 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  placeholder="Nombre o ID"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1.5">
                  Costo unitario
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.costPerUnit}
                  onChange={(e) => setField('costPerUnit', e.target.value)}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 placeholder-neutral-400 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-600">
                {error}
              </div>
            )}
          </div>

          {/* Modal footer */}
          <div className="flex items-center justify-end gap-2 border-t border-neutral-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-800 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 active:bg-primary-700 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="7" cy="7" r="5" strokeOpacity=".3" />
                    <path d="M7 2a5 5 0 0 1 5 5" strokeLinecap="round" />
                  </svg>
                  Guardando…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M7 1v12M1 7h12" />
                  </svg>
                  Agregar plancha
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stock-adjustment modal component
// ─────────────────────────────────────────────────────────────────────────────

interface StockAdjustModalProps {
  board: Board;
  onClose: () => void;
  onSuccess: (boardId: string, delta: number) => void;
}

function StockAdjustModal({ board, onClose, onSuccess }: StockAdjustModalProps) {
  const [form, setForm] = useState<AdjustForm>(DEFAULT_ADJUST_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deltaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    deltaInputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const delta = parseFloat(form.delta);
    if (isNaN(delta) || delta === 0) {
      setError('El delta debe ser un número distinto de cero.');
      return;
    }
    if (!form.reason.trim()) {
      setError('El motivo es requerido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/scm/inventory/boards/${board.id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta, reason: form.reason.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? `Error ${res.status}`);
      }

      onSuccess(board.id, delta);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ajustar el stock.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const parsedDelta = parseFloat(form.delta);
  const isPositive = !isNaN(parsedDelta) && parsedDelta > 0;
  const isNegative = !isNaN(parsedDelta) && parsedDelta < 0;

  return (
    <motion.div
      key="adjust-stock-overlay"
      variants={modalOverlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-modal="true"
      role="dialog"
      aria-label="Ajustar stock"
    >
      <motion.div
        variants={modalCardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-800">Ajustar stock</h2>
            <p className="mt-0.5 font-mono text-[11px] text-neutral-400">{board.materialSku} · {board.widthMm}×{board.heightMm}×{board.thicknessMm}mm</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 space-y-4">
            {/* Delta */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1.5">
                Delta <span className="text-red-400">*</span>
                <span className="ml-1 normal-case font-normal text-neutral-400">(+ entrada · − salida)</span>
              </label>
              <input
                ref={deltaInputRef}
                type="number"
                step="any"
                value={form.delta}
                onChange={(e) => { setForm((f) => ({ ...f, delta: e.target.value })); setError(null); }}
                className={`h-9 w-full rounded-lg border bg-white px-3 text-sm font-semibold outline-none transition-all focus:ring-2
                  ${isPositive ? 'border-green-300 text-green-700 focus:border-green-400 focus:ring-green-100'
                  : isNegative ? 'border-red-300 text-red-600 focus:border-red-400 focus:ring-red-100'
                  : 'border-neutral-200 text-neutral-700 focus:border-primary-400 focus:ring-primary-100'}`}
                placeholder="ej: +5 o -2"
                required
              />
              {!isNaN(parsedDelta) && parsedDelta !== 0 && (
                <p className={`mt-1 text-[11px] font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                  {isPositive ? `Entrada de ${parsedDelta} unidad(es)` : `Salida de ${Math.abs(parsedDelta)} unidad(es)`}
                </p>
              )}
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1.5">
                Motivo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => { setForm((f) => ({ ...f, reason: e.target.value })); setError(null); }}
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 placeholder-neutral-400 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                placeholder="ej: Compra proveedor, Consumo OT-001…"
                required
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-600">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-neutral-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 active:bg-primary-700 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="7" cy="7" r="5" strokeOpacity=".3" />
                    <path d="M7 2a5 5 0 0 1 5 5" strokeLinecap="round" />
                  </svg>
                  Guardando…
                </>
              ) : 'Confirmar ajuste'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail panel slide-in variants
// ─────────────────────────────────────────────────────────────────────────────

const panelVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: { duration: 0.2, ease: [0.55, 0, 1, 0.45] as [number, number, number, number] },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Detail panel component
// ─────────────────────────────────────────────────────────────────────────────

interface DetailPanelProps {
  item: SelectedItem;
  onClose: () => void;
}

function DetailPanel({ item, onClose }: DetailPanelProps) {
  if (!item) return null;

  const isBoard = item.kind === 'board';
  const data = item.data;
  const statusLabel = STATUS_LABELS[data.status] ?? data.status;

  const statusClasses =
    data.status === 'AVAILABLE'
      ? 'bg-green-50 text-green-700 border border-green-200'
      : data.status === 'RESERVED'
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : 'bg-neutral-100 text-neutral-500';

  return (
    <motion.div
      key="detail-panel"
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed right-0 top-0 z-40 flex h-full w-[380px] flex-col border-l border-neutral-200 bg-white shadow-2xl"
      role="dialog"
      aria-label="Detalle del item"
      aria-modal="true"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${
              isBoard
                ? 'bg-primary-50 text-primary-600 border border-primary-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}
          >
            {isBoard ? 'Plancha' : 'Retazo'}
          </span>
          <h2 className="text-sm font-semibold text-neutral-800">Detalle</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          aria-label="Cerrar panel"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Status badge */}
        <div className="mb-5 flex items-center gap-2">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}`}>
            {statusLabel}
          </span>
        </div>

        {/* Fields */}
        <dl className="space-y-4">
          <DetailRow label="ID completo" value={data.id} mono />
          <DetailRow label="Material SKU" value={data.materialSku} mono />
          <DetailRow
            label="Dimensiones"
            value={`${data.widthMm} × ${data.heightMm} × ${data.thicknessMm} mm`}
          />
          <DetailRow
            label="Área"
            value={`${toM2(data.widthMm, data.heightMm)} m²`}
          />
          <DetailRow label="Estado" value={statusLabel} />

          {isBoard && (
            <>
              <div className="my-4 border-t border-neutral-100" />
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Información de compra
              </p>
              <DetailRow
                label="Comprado el"
                value={formatDate((data as Board).purchasedAt)}
              />
              <DetailRow
                label="Proveedor ID"
                value={(data as Board).supplierId ?? '—'}
                mono
              />
              {(data as Board).reservedByWorkOrderId && (
                <DetailRow
                  label="Reservada por OT"
                  value={(data as Board).reservedByWorkOrderId!}
                  mono
                />
              )}
            </>
          )}

          {!isBoard && (
            <>
              <div className="my-4 border-t border-neutral-100" />
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Trazabilidad
              </p>
              <DetailRow
                label="Plancha de origen"
                value={(data as Offcut).sourceBoardId}
                mono
              />
              <DetailRow
                label="OT de origen"
                value={(data as Offcut).sourceWorkOrderId}
                mono
              />
              {(data as Offcut).reservedByWorkOrderId && (
                <DetailRow
                  label="Reservado por OT"
                  value={(data as Offcut).reservedByWorkOrderId!}
                  mono
                />
              )}
            </>
          )}
        </dl>
      </div>
    </motion.div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
        {label}
      </dt>
      <dd
        className={`mt-0.5 break-all text-sm text-neutral-800 ${
          mono ? 'font-mono text-[12px]' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const router = useRouter();

  const [boards, setBoards] = useState<Board[]>([]);
  const [offcuts, setOffcuts] = useState<Offcut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterState>({ materialSku: '', status: '' });
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);

  // ── Modal state ──
  const [showAddBoard, setShowAddBoard] = useState(false);
  const [adjustingBoard, setAdjustingBoard] = useState<Board | null>(null);

  // ── Fetch inventory (extracted so it can be called after mutations) ──
  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/scm/inventory');
      if (!res.ok) throw new Error('Failed to fetch inventory');
      const data: InventoryResponse = await res.json();
      setBoards(data.boards ?? []);
      setOffcuts(data.offcuts ?? []);
    } catch {
      setBoards([]);
      setOffcuts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // ── Filtered data ──
  const skuQuery = filter.materialSku.trim().toLowerCase();

  const filteredBoards = boards.filter((b) => {
    const matchesSku = skuQuery === '' || b.materialSku.toLowerCase().includes(skuQuery);
    const matchesStatus = filter.status === '' || b.status === filter.status;
    return matchesSku && matchesStatus;
  });

  const filteredOffcuts = offcuts.filter((o) => {
    const matchesSku = skuQuery === '' || o.materialSku.toLowerCase().includes(skuQuery);
    const matchesStatus = filter.status === '' || o.status === filter.status;
    return matchesSku && matchesStatus;
  });

  // ── Selection handlers ──
  const handleBoardSelect = useCallback((board: Board) => {
    setSelectedItem((prev) =>
      prev?.kind === 'board' && prev.data.id === board.id
        ? null
        : { kind: 'board', data: board },
    );
  }, []);

  const handleOffcutSelect = useCallback((offcut: Offcut) => {
    setSelectedItem((prev) =>
      prev?.kind === 'offcut' && prev.data.id === offcut.id
        ? null
        : { kind: 'offcut', data: offcut },
    );
  }, []);

  const closePanel = useCallback(() => setSelectedItem(null), []);

  // ── Stock adjustment: open mini-modal ──
  const handleBoardAdjust = useCallback((board: Board) => {
    setAdjustingBoard(board);
  }, []);

  // ── After adjustment: optimistic update then re-fetch ──
  const handleAdjustSuccess = useCallback((_boardId: string, _delta: number) => {
    // Re-fetch to get the authoritative state from server
    fetchInventory();
  }, [fetchInventory]);

  // ── Close panel on Escape ──
  useEffect(() => {
    if (!selectedItem) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closePanel();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedItem, closePanel]);

  return (
    <>
      <TopBar
        title="Inventario SCM"
        subtitle="Planchas y retazos — Stock de materiales"
      />

      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        className="p-4 sm:p-6 lg:p-8"
        // Shift content left when panel is open so it doesn't sit under the panel
        style={{
          paddingRight: selectedItem ? 'calc(380px + 2rem)' : undefined,
          transition: 'padding-right 0.25s ease',
        }}
      >
        {/* ── Page header: back button + primary CTA ── */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 hover:text-neutral-800 active:bg-neutral-100"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 2L4 7l5 5" />
            </svg>
            Volver
          </button>

          <button
            onClick={() => setShowAddBoard(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 active:bg-primary-700"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M7 1v12M1 7h12" />
            </svg>
            Agregar plancha
          </button>
        </div>

        {/* ── Filter bar ── */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {/* SKU search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="6" cy="6" r="4.5" />
              <path d="M10 10l3 3" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por SKU..."
              value={filter.materialSku}
              onChange={(e) =>
                setFilter((f) => ({ ...f, materialSku: e.target.value }))
              }
              className="h-9 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-4 text-sm text-neutral-700 placeholder-neutral-400 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          {/* Status filter */}
          <select
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
            className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            <option value="AVAILABLE">Disponible</option>
            <option value="RESERVED">Reservada</option>
            <option value="CONSUMED">Consumida</option>
          </select>

          {/* Result counts */}
          {!isLoading && (
            <p className="ml-auto text-xs text-neutral-400">
              {filteredBoards.length} planchas · {filteredOffcuts.length} retazos
            </p>
          )}
        </div>

        {/* ── Inventory Grid ── */}
        <InventoryGrid
          boards={filteredBoards}
          offcuts={filteredOffcuts}
          onBoardSelect={handleBoardSelect}
          onOffcutSelect={handleOffcutSelect}
          onBoardAdjust={handleBoardAdjust}
          isLoading={isLoading}
        />
      </motion.div>

      {/* ── Detail panel (slide-in from right, fixed) ── */}
      <AnimatePresence>
        {selectedItem && (
          <>
            {/* Backdrop (transparent, click to close) */}
            <motion.div
              key="panel-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-30"
              onClick={closePanel}
              aria-hidden="true"
            />
            <DetailPanel item={selectedItem} onClose={closePanel} />
          </>
        )}
      </AnimatePresence>

      {/* ── "Agregar plancha" modal ── */}
      <AnimatePresence>
        {showAddBoard && (
          <AddBoardModal
            onClose={() => setShowAddBoard(false)}
            onSuccess={fetchInventory}
          />
        )}
      </AnimatePresence>

      {/* ── Stock adjustment modal ── */}
      <AnimatePresence>
        {adjustingBoard && (
          <StockAdjustModal
            board={adjustingBoard}
            onClose={() => setAdjustingBoard(null)}
            onSuccess={handleAdjustSuccess}
          />
        )}
      </AnimatePresence>
    </>
  );
}
