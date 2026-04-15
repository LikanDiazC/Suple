'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '../../animations/variants';
import type { Board, Offcut, BoardStatus, OffcutStatus } from '../../../types/scm';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface InventoryGridProps {
  boards: Board[];
  offcuts: Offcut[];
  onBoardSelect?: (board: Board) => void;
  onOffcutSelect?: (offcut: Offcut) => void;
  isLoading?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status badge config
// ─────────────────────────────────────────────────────────────────────────────

type AnyStatus = BoardStatus | OffcutStatus;

interface StatusConfig {
  label: string;
  classes: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  AVAILABLE: {
    label: 'Disponible',
    classes: 'bg-green-50 text-green-700 border border-green-200',
  },
  RESERVED: {
    label: 'Reservada',
    classes: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  CONSUMED: {
    label: 'Consumida',
    classes: 'bg-neutral-100 text-neutral-400',
  },
  SCRAPPED: {
    label: 'Descartada',
    classes: 'bg-red-50 text-red-400',
  },
  DISCARDED: {
    label: 'Descartada',
    classes: 'bg-red-50 text-red-400',
  },
};

function getStatusConfig(status: AnyStatus): StatusConfig {
  return STATUS_CONFIG[status] ?? { label: status, classes: 'bg-neutral-100 text-neutral-500' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Standard reference board size (mm) used for the visual area indicator. */
const REF_W = 2440;
const REF_H = 1220;
/** Max height of the visual indicator rectangle (px) */
const INDICATOR_MAX_H = 40;
/** Max width of the visual indicator rectangle (px) */
const INDICATOR_MAX_W = 72;

/** Compute proportional indicator dimensions relative to a 2440×1220 reference. */
function indicatorSize(
  widthMm: number,
  heightMm: number,
): { w: number; h: number } {
  const ratioW = Math.min(widthMm / REF_W, 1);
  const ratioH = Math.min(heightMm / REF_H, 1);
  const w = Math.max(Math.round(ratioW * INDICATOR_MAX_W), 4);
  const h = Math.max(Math.round(ratioH * INDICATOR_MAX_H), 4);
  return { w, h };
}

/** Format mm² to m² with 3 decimal places. */
function toM2(areaMm2: number): string {
  return (areaMm2 / 1_000_000).toFixed(3);
}

/** Sum of widthMm × heightMm for items with AVAILABLE status. */
function totalAvailableArea(items: { widthMm: number; heightMm: number; status: string }[]): number {
  return items
    .filter((i) => i.status === 'AVAILABLE')
    .reduce((sum, i) => sum + i.widthMm * i.heightMm, 0);
}

/** Count by status. */
function countByStatus<T extends { status: string }>(
  items: T[],
  status: string,
): number {
  return items.filter((i) => i.status === status).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline SVG icons
// ─────────────────────────────────────────────────────────────────────────────

function IconBoard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M4 7h8M4 9.5h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconOffcut() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <rect x="10" y="1" width="5" height="5" rx="1" fill="currentColor" opacity=".5" />
      <rect x="1" y="10" width="5" height="5" rx="1" fill="currentColor" opacity=".5" />
      <rect x="8" y="8" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

function IconArea() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M1 5h12M5 1v12" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1.5" opacity=".5" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton card
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-neutral-200 bg-white p-4 shadow-sm" aria-hidden="true">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-20 rounded bg-neutral-200" />
        <div className="h-5 w-16 rounded-full bg-neutral-200" />
      </div>
      <div className="mb-2 h-3 w-32 rounded bg-neutral-100" />
      <div className="flex items-end gap-3">
        <div className="h-8 w-14 rounded bg-neutral-100" />
        <div className="h-3 w-16 rounded bg-neutral-100" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Board card
// ─────────────────────────────────────────────────────────────────────────────

interface BoardCardProps {
  board: Board;
  onClick?: (board: Board) => void;
}

function BoardCard({ board, onClick }: BoardCardProps) {
  const statusCfg = getStatusConfig(board.status);
  const { w, h } = indicatorSize(board.widthMm, board.heightMm);
  const isClickable = !!onClick;

  return (
    <motion.div
      variants={staggerItem}
      whileHover={isClickable ? { y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' } : undefined}
      whileTap={isClickable ? { scale: 0.98 } : undefined}
      onClick={isClickable ? () => onClick(board) : undefined}
      className={`
        rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-colors
        ${isClickable ? 'cursor-pointer hover:border-primary-200' : ''}
      `}
      role={isClickable ? 'button' : 'article'}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={`Plancha ${board.materialSku} ${board.widthMm}×${board.heightMm}mm, estado: ${statusCfg.label}`}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick!(board);
        }
      }}
    >
      {/* Top row: SKU badge + status */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-md bg-primary-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary-600 border border-primary-200 truncate max-w-[110px]">
          {board.materialSku}
        </span>
        <span
          className={`inline-flex flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.classes}`}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Dimensions */}
      <p className="mb-1 text-[11px] font-medium text-neutral-500">
        {board.widthMm} × {board.heightMm} × {board.thicknessMm} mm
      </p>

      {/* Reserved by WO */}
      {board.status === 'RESERVED' && board.reservedByWorkOrderId && (
        <p className="mb-2 text-[10px] text-amber-600 font-medium">
          OT: {board.reservedByWorkOrderId.slice(-6)}
        </p>
      )}

      {/* Visual area indicator + label */}
      <div className="mt-3 flex items-end gap-3">
        <div
          className="flex-shrink-0 rounded-sm border border-neutral-300 bg-neutral-100"
          style={{ width: w, height: h }}
          title={`${board.widthMm}×${board.heightMm}mm proporcional a plancha estándar 2440×1220mm`}
          aria-hidden="true"
        />
        <span className="text-[10px] text-neutral-400 leading-tight">
          {toM2(board.widthMm * board.heightMm)} m²
        </span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Offcut card
// ─────────────────────────────────────────────────────────────────────────────

interface OffcutCardProps {
  offcut: Offcut;
  onClick?: (offcut: Offcut) => void;
}

function OffcutCard({ offcut, onClick }: OffcutCardProps) {
  const statusCfg = getStatusConfig(offcut.status);
  const { w, h } = indicatorSize(offcut.widthMm, offcut.heightMm);
  const isClickable = !!onClick;

  return (
    <motion.div
      variants={staggerItem}
      whileHover={isClickable ? { y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' } : undefined}
      whileTap={isClickable ? { scale: 0.98 } : undefined}
      onClick={isClickable ? () => onClick(offcut) : undefined}
      className={`
        rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-colors
        ${isClickable ? 'cursor-pointer hover:border-green-200' : ''}
      `}
      role={isClickable ? 'button' : 'article'}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={`Retazo ${offcut.materialSku} ${offcut.widthMm}×${offcut.heightMm}mm, estado: ${statusCfg.label}`}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick!(offcut);
        }
      }}
    >
      {/* Top row: SKU badge + status */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-green-700 border border-green-200 truncate max-w-[110px]">
          {offcut.materialSku}
        </span>
        <span
          className={`inline-flex flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.classes}`}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Dimensions */}
      <p className="mb-1 text-[11px] font-medium text-neutral-500">
        {offcut.widthMm} × {offcut.heightMm} × {offcut.thicknessMm} mm
      </p>

      {/* Reserved by WO */}
      {offcut.status === 'RESERVED' && offcut.reservedByWorkOrderId && (
        <p className="mb-2 text-[10px] text-amber-600 font-medium">
          OT: {offcut.reservedByWorkOrderId.slice(-6)}
        </p>
      )}

      {/* Traceability: source board */}
      <p className="text-[10px] text-neutral-400 truncate">
        Plancha:{' '}
        <span className="font-mono">{offcut.sourceBoardId.slice(-8)}</span>
      </p>

      {/* Visual area indicator */}
      <div className="mt-3 flex items-end gap-3">
        <div
          className="flex-shrink-0 rounded-sm border border-green-200 bg-green-50"
          style={{ width: w, height: h }}
          title={`${offcut.widthMm}×${offcut.heightMm}mm proporcional a plancha estándar 2440×1220mm`}
          aria-hidden="true"
        />
        <span className="text-[10px] text-neutral-400 leading-tight">
          {toM2(offcut.widthMm * offcut.heightMm)} m²
        </span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section header with count badges
// ─────────────────────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  total: number;
  available: number;
  reserved: number;
  other: number;
  icon: React.ReactNode;
}

function SectionHeader({
  title,
  total,
  available,
  reserved,
  other,
  icon,
}: SectionHeaderProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-neutral-600">{icon}</span>
        <h2 className="text-sm font-semibold text-neutral-800">{title}</h2>
        <span className="ml-auto text-[11px] font-semibold text-neutral-400">
          {total} total
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200">
          {available} Disponibles
        </span>
        <span className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          {reserved} Reservadas
        </span>
        {other > 0 && (
          <span className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-neutral-100 text-neutral-500">
            {other} Otras
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section footer — total available area
// ─────────────────────────────────────────────────────────────────────────────

function SectionFooter({ areaMm2 }: { areaMm2: number }) {
  return (
    <div className="mt-4 flex items-center gap-1.5 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
      <span className="text-neutral-400">
        <IconArea />
      </span>
      <p className="text-[11px] text-neutral-500">
        Área disponible total:{' '}
        <span className="font-semibold text-neutral-700">{toM2(areaMm2)} m²</span>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function InventoryGrid({
  boards,
  offcuts,
  onBoardSelect,
  onOffcutSelect,
  isLoading = false,
}: InventoryGridProps) {
  const boardStats = useMemo(
    () => ({
      available: countByStatus(boards, 'AVAILABLE'),
      reserved: countByStatus(boards, 'RESERVED'),
      other: boards.length - countByStatus(boards, 'AVAILABLE') - countByStatus(boards, 'RESERVED'),
      area: totalAvailableArea(boards),
    }),
    [boards],
  );

  const offcutStats = useMemo(
    () => ({
      available: countByStatus(offcuts, 'AVAILABLE'),
      reserved: countByStatus(offcuts, 'RESERVED'),
      other: offcuts.length - countByStatus(offcuts, 'AVAILABLE') - countByStatus(offcuts, 'RESERVED'),
      area: totalAvailableArea(offcuts),
    }),
    [offcuts],
  );

  return (
    <div className="flex flex-col gap-6 md:flex-row md:gap-5">
      {/* ── Boards section ── */}
      <section className="w-full md:w-1/2" aria-label="Planchas en inventario">
        <SectionHeader
          title="Planchas"
          total={boards.length}
          available={boardStats.available}
          reserved={boardStats.reserved}
          other={boardStats.other}
          icon={<IconBoard />}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-label="Cargando planchas">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 py-12 text-center">
            <p className="text-sm text-neutral-400">No hay planchas en inventario.</p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 gap-3 lg:grid-cols-2"
          >
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                onClick={onBoardSelect}
              />
            ))}
          </motion.div>
        )}

        <SectionFooter areaMm2={boardStats.area} />
      </section>

      {/* Divider on md+ */}
      <div className="hidden md:block w-px bg-neutral-200 self-stretch" aria-hidden="true" />

      {/* ── Offcuts section ── */}
      <section className="w-full md:w-1/2" aria-label="Retazos en inventario">
        <SectionHeader
          title="Retazos"
          total={offcuts.length}
          available={offcutStats.available}
          reserved={offcutStats.reserved}
          other={offcutStats.other}
          icon={<IconOffcut />}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-label="Cargando retazos">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : offcuts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 py-12 text-center">
            <p className="text-sm text-neutral-400">No hay retazos registrados.</p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 gap-3 lg:grid-cols-2"
          >
            {offcuts.map((offcut) => (
              <OffcutCard
                key={offcut.id}
                offcut={offcut}
                onClick={onOffcutSelect}
              />
            ))}
          </motion.div>
        )}

        <SectionFooter areaMm2={offcutStats.area} />
      </section>
    </div>
  );
}
