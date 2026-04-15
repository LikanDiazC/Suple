'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem, pageTransition } from '../../animations/variants';
import type {
  CuttingPlan,
  BoardAllocation,
  PiecePlacement,
  PlannedOffcut,
} from '../../../types/scm';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface CuttingPlanViewerProps {
  plan: CuttingPlan;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Boards used = total allocations */
function boardsUsed(plan: CuttingPlan): number {
  return plan.boardAllocations.length;
}

/** Total offcuts generated across all allocations */
function offcutsGenerated(plan: CuttingPlan): number {
  return plan.boardAllocations.reduce((sum, a) => sum + a.offcuts.length, 0);
}

/** Efficiency colour class based on percentage value */
function efficiencyColorClasses(pct: number): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  if (pct >= 90)
    return {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      dot: 'bg-green-500',
    };
  if (pct >= 75)
    return {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
    };
  return {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats Bar
// ─────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'green' | 'amber' | 'red' | 'blue' | 'neutral';
  icon: React.ReactNode;
}

function StatCard({ label, value, sub, accent = 'blue', icon }: StatCardProps) {
  const accentClasses: Record<string, string> = {
    green: 'text-green-600 bg-green-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
    blue: 'text-primary-600 bg-primary-50',
    neutral: 'text-neutral-500 bg-neutral-100',
  };

  return (
    <motion.div
      variants={staggerItem}
      className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${accentClasses[accent]}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          {label}
        </p>
        <p className="text-xl font-bold text-neutral-900 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-neutral-400">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG icons (inline, no external library)
// ─────────────────────────────────────────────────────────────────────────────

function IconEfficiency() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 14.5A6.5 6.5 0 1110 3.5a6.5 6.5 0 010 13z"
        fill="currentColor"
        opacity=".3"
      />
      <path
        d="M10 5v5l3.5 2-0.75 1.3L9 11.5V5H10z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconBoards() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="16" height="3" rx="1" fill="currentColor" opacity=".3" />
      <rect x="2" y="9" width="16" height="3" rx="1" fill="currentColor" opacity=".6" />
      <rect x="2" y="14" width="10" height="3" rx="1" fill="currentColor" />
    </svg>
  );
}

function IconOffcuts() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="9" height="9" rx="1" fill="currentColor" opacity=".4" />
      <rect x="13" y="2" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="2" y="13" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="13" y="9" width="5" height="9" rx="1" fill="currentColor" opacity=".3" />
    </svg>
  );
}

function IconUnplaced() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M9.08 3.54L2.25 15A1 1 0 003.12 16.5h13.76a1 1 0 00.87-1.5L10.92 3.54a1 1 0 00-1.84 0z"
        fill="currentColor"
        opacity=".15"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M10 8v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="14" r="0.75" fill="currentColor" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback SVG layout renderer
// ─────────────────────────────────────────────────────────────────────────────

/** Scale placements from board mm space into a 600px wide canvas */
function FallbackBoardSVG({ allocation }: { allocation: BoardAllocation }) {
  const CANVAS_W = 600;
  const scaleX = CANVAS_W / allocation.widthMm;
  const canvasH = Math.round(allocation.heightMm * scaleX);

  // Build a stable colour per piece index
  const pieceColors = [
    '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#0EA5E9',
    '#14B8A6', '#F59E0B', '#EF4444',
  ];

  return (
    <svg
      viewBox={`0 0 ${CANVAS_W} ${canvasH}`}
      width={CANVAS_W}
      height={canvasH}
      className="w-full h-auto border border-neutral-200 rounded-lg bg-neutral-50"
      role="img"
      aria-label={`Board layout for stock ${allocation.stockId}`}
    >
      {/* Board outline */}
      <rect
        x={0}
        y={0}
        width={CANVAS_W}
        height={canvasH}
        fill="#F9FAFB"
        stroke="#D1D5DB"
        strokeWidth={2}
        rx={4}
      />

      {/* Piece placements */}
      {allocation.placements.map((p: PiecePlacement, idx: number) => {
        const x = Math.round(p.x * scaleX);
        const y = Math.round(p.y * scaleX);
        const w = Math.max(Math.round(p.widthMm * scaleX), 2);
        const h = Math.max(Math.round(p.heightMm * scaleX), 2);
        const color = pieceColors[idx % pieceColors.length];
        const labelText = p.label ?? p.pieceId.slice(-6);
        const fontSize = Math.max(Math.min(w / 6, h / 2, 11), 7);

        return (
          <g key={`piece-${idx}`}>
            <rect
              x={x + 1}
              y={y + 1}
              width={w - 2}
              height={h - 2}
              fill={color}
              fillOpacity={0.75}
              rx={2}
            />
            {w > 24 && h > 14 && (
              <text
                x={x + w / 2}
                y={y + h / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#FFFFFF"
                fontSize={fontSize}
                fontFamily="Inter, sans-serif"
                fontWeight="600"
              >
                {labelText}
              </text>
            )}
            {p.rotated && w > 12 && h > 12 && (
              <text
                x={x + w - 4}
                y={y + 5}
                textAnchor="end"
                fill="#FFFFFF"
                fontSize={Math.max(fontSize - 1, 6)}
                fontFamily="Inter, sans-serif"
                opacity={0.8}
              >
                ↻
              </text>
            )}
          </g>
        );
      })}

      {/* Offcut rectangles */}
      {allocation.offcuts.map((o: PlannedOffcut, idx: number) => {
        const x = Math.round(o.x * scaleX);
        const y = Math.round(o.y * scaleX);
        const w = Math.max(Math.round(o.widthMm * scaleX), 2);
        const h = Math.max(Math.round(o.heightMm * scaleX), 2);

        return (
          <g key={`offcut-${idx}`}>
            <rect
              x={x + 1}
              y={y + 1}
              width={w - 2}
              height={h - 2}
              fill="#D1FAE5"
              stroke="#6EE7B7"
              strokeWidth={1}
              rx={2}
            />
            {w > 28 && h > 14 && (
              <text
                x={x + w / 2}
                y={y + h / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#065F46"
                fontSize={Math.max(Math.min(w / 8, 10), 6)}
                fontFamily="Inter, sans-serif"
              >
                retazo
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Board tab selector
// ─────────────────────────────────────────────────────────────────────────────

interface BoardTabsProps {
  allocations: BoardAllocation[];
  activeIndex: number;
  onSelect: (i: number) => void;
}

function BoardTabs({ allocations, activeIndex, onSelect }: BoardTabsProps) {
  return (
    <div
      className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-200"
      role="tablist"
      aria-label="Board allocations"
    >
      {allocations.map((a, i) => (
        <button
          key={a.stockId}
          role="tab"
          aria-selected={i === activeIndex}
          aria-controls={`board-panel-${i}`}
          onClick={() => onSelect(i)}
          className={`
            flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors
            ${
              i === activeIndex
                ? 'bg-primary-600 text-white shadow-sm'
                : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
            }
          `}
        >
          {a.stockType === 'OFFCUT' ? 'Retazo' : 'Plancha'} {i + 1}
          <span
            className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              i === activeIndex ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
            }`}
          >
            {a.placements.length}p
          </span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Placements list below the SVG
// ─────────────────────────────────────────────────────────────────────────────

function PlacementsList({ placements }: { placements: PiecePlacement[] }) {
  if (placements.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
        Piezas colocadas
      </p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
        {placements.map((p, idx) => (
          <div
            key={idx}
            className="rounded-md border border-neutral-100 bg-neutral-50 px-2.5 py-1.5"
          >
            <p className="truncate text-[11px] font-semibold text-neutral-700">
              {p.label ?? p.pieceId.slice(-8)}
            </p>
            <p className="text-[10px] text-neutral-400">
              {p.widthMm}×{p.heightMm} mm
              {p.rotated && (
                <span className="ml-1 text-amber-600" title="Rotada 90°">
                  ↻
                </span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CuttingPlanViewer({ plan, className = '' }: CuttingPlanViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const efficiency = plan.totalEfficiencyPct;
  const effClasses = useMemo(() => efficiencyColorClasses(efficiency), [efficiency]);

  const activeAllocation: BoardAllocation | undefined =
    plan.boardAllocations[activeIndex];

  const hasSvg =
    activeAllocation !== undefined &&
    !!plan.svgLayouts?.[activeAllocation.stockId];

  const svgContent: string | undefined =
    hasSvg ? plan.svgLayouts[activeAllocation!.stockId] : undefined;

  const totalBoards = boardsUsed(plan);
  const totalOffcuts = offcutsGenerated(plan);
  const unplacedCount = plan.unplacedPieceIds.length;

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      className={`space-y-5 ${className}`}
    >
      {/* ── Stats bar ── */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <StatCard
          label="Eficiencia"
          value={`${efficiency.toFixed(1)}%`}
          sub={efficiency >= 90 ? 'Óptima' : efficiency >= 75 ? 'Aceptable' : 'Baja'}
          accent={efficiency >= 90 ? 'green' : efficiency >= 75 ? 'amber' : 'red'}
          icon={<IconEfficiency />}
        />
        <StatCard
          label="Planchas usadas"
          value={totalBoards}
          accent="blue"
          icon={<IconBoards />}
        />
        <StatCard
          label="Retazos generados"
          value={totalOffcuts}
          sub="re-ingresan a inventario"
          accent="neutral"
          icon={<IconOffcuts />}
        />
        <StatCard
          label="Piezas sin ubicar"
          value={unplacedCount}
          sub={unplacedCount === 0 ? 'Todas colocadas' : 'Revisar stock'}
          accent={unplacedCount === 0 ? 'green' : 'red'}
          icon={<IconUnplaced />}
        />
      </motion.div>

      {/* ── Unplaced warning ── */}
      <AnimatePresence>
        {unplacedCount > 0 && (
          <motion.div
            key="unplaced-warning"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
            role="alert"
          >
            <span className="mt-0.5 flex-shrink-0 text-amber-600">
              <IconWarning />
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {unplacedCount} {unplacedCount === 1 ? 'pieza no pudo colocarse' : 'piezas no pudieron colocarse'}
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                IDs:{' '}
                {plan.unplacedPieceIds.slice(0, 6).map((id) => (
                  <code
                    key={id}
                    className="mx-0.5 rounded bg-amber-100 px-1 py-0.5 font-mono text-[10px]"
                  >
                    {id.slice(-8)}
                  </code>
                ))}
                {plan.unplacedPieceIds.length > 6 && (
                  <span className="ml-1 text-amber-600">
                    +{plan.unplacedPieceIds.length - 6} más
                  </span>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Board layout viewer ── */}
      {plan.boardAllocations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 py-16 text-center">
          <p className="text-sm text-neutral-400">No hay asignaciones de planchas en este plan.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-neutral-800">
              Distribución de corte
            </h3>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${effClasses.bg} ${effClasses.text} ${effClasses.border}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${effClasses.dot}`} />
              {efficiency.toFixed(1)}% eficiencia
            </span>
          </div>

          <div className="p-5 space-y-4">
            {/* Tab selector */}
            <BoardTabs
              allocations={plan.boardAllocations}
              activeIndex={activeIndex}
              onSelect={setActiveIndex}
            />

            {/* Panel */}
            <AnimatePresence mode="wait">
              {activeAllocation && (
                <motion.div
                  key={activeAllocation.stockId}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  id={`board-panel-${activeIndex}`}
                  role="tabpanel"
                >
                  {/* Board meta */}
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                    <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-mono font-semibold">
                      {activeAllocation.stockId.slice(-12)}
                    </span>
                    <span>
                      {activeAllocation.widthMm} × {activeAllocation.heightMm} mm
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        activeAllocation.stockType === 'OFFCUT'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-primary-50 text-primary-600'
                      }`}
                    >
                      {activeAllocation.stockType === 'OFFCUT' ? 'Retazo' : 'Plancha nueva'}
                    </span>
                    <span>{activeAllocation.placements.length} piezas</span>
                    {activeAllocation.offcuts.length > 0 && (
                      <span className="text-green-600">
                        {activeAllocation.offcuts.length} retazo(s) resultante(s)
                      </span>
                    )}
                  </div>

                  {/* SVG area */}
                  {hasSvg ? (
                    <div className="w-full overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-2">
                      <div
                        /* eslint-disable-next-line react/no-danger */
                        dangerouslySetInnerHTML={{ __html: svgContent! }}
                        className="w-full [&>svg]:max-w-full [&>svg]:h-auto"
                      />
                    </div>
                  ) : (
                    <FallbackBoardSVG allocation={activeAllocation} />
                  )}

                  {/* Placements list */}
                  <PlacementsList placements={activeAllocation.placements} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
}
