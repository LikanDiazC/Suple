'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

  // ── Fetch inventory ──
  useEffect(() => {
    let cancelled = false;
    async function fetchInventory() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/scm/inventory');
        if (!res.ok) throw new Error('Failed to fetch inventory');
        const data: InventoryResponse = await res.json();
        if (!cancelled) {
          setBoards(data.boards ?? []);
          setOffcuts(data.offcuts ?? []);
        }
      } catch {
        if (!cancelled) {
          setBoards([]);
          setOffcuts([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchInventory();
    return () => { cancelled = true; };
  }, []);

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
        className="p-8"
        // Shift content left when panel is open so it doesn't sit under the panel
        style={{
          paddingRight: selectedItem ? 'calc(380px + 2rem)' : undefined,
          transition: 'padding-right 0.25s ease',
        }}
      >
        {/* ── Back button ── */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 hover:text-neutral-800 active:bg-neutral-100"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 2L4 7l5 5" />
            </svg>
            Volver
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
    </>
  );
}
