'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import TopBar from '../../../../presentation/components/layout/TopBar';
import { pageTransition, staggerContainer, staggerItem } from '../../../../presentation/animations/variants';
import type { WorkOrder, WorkOrderStatus } from '../../../../types/scm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterTab = 'ALL' | WorkOrderStatus;

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: 'Todas',        value: 'ALL' },
  { label: 'Pendientes',   value: 'PENDING' },
  { label: 'Optimizando',  value: 'OPTIMIZING' },
  { label: 'Cortando',     value: 'CUTTING' },
  { label: 'Completadas',  value: 'COMPLETED' },
  { label: 'Canceladas',   value: 'CANCELLED' },
];

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
  PENDING:    { bg: 'bg-neutral-100',  text: 'text-neutral-600', label: 'Pendiente' },
  OPTIMIZING: { bg: 'bg-blue-50',     text: 'text-blue-700',    label: 'Optimizando', pulse: true },
  CUTTING:    { bg: 'bg-amber-50',    text: 'text-amber-700',   label: 'Cortando' },
  COMPLETED:  { bg: 'bg-green-50',    text: 'text-green-700',   label: 'Completado' },
  CANCELLED:  { bg: 'bg-red-50',      text: 'text-red-500',     label: 'Cancelado' },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: WorkOrderStatus }) {
  const cfg = STATUS_BADGE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
        </span>
      )}
      {cfg.label}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-20 rounded-full bg-neutral-100" />
          <div className="h-4 w-24 rounded bg-neutral-100" />
        </div>
        <div className="h-4 w-24 rounded bg-neutral-100" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="h-3 w-36 rounded bg-neutral-100" />
        <div className="h-8 w-28 rounded-lg bg-neutral-100" />
      </div>
    </div>
  );
}

function EmptyState({ filter }: { filter: FilterTab }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M9 9h6M9 12h6M9 15h4" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-neutral-700">No hay órdenes en este estado</p>
      <p className="mt-1 text-xs text-neutral-400">
        {filter === 'ALL'
          ? 'Crea tu primera orden de trabajo con el botón "Nueva Orden".'
          : `No se encontraron órdenes en este estado.`}
      </p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function WorkOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  const fetchOrders = useCallback(async (filter: FilterTab) => {
    try {
      const qs = filter !== 'ALL' ? `?status=${filter}` : '';
      const res = await fetch(`/api/scm/work-orders${qs}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      // Support both paginated { items } and plain array responses
      setOrders(Array.isArray(data) ? data : (data.items ?? []));
    } catch {
      // Keep previous data on error; in production you'd surface this
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + re-fetch when filter changes
  useEffect(() => {
    setLoading(true);
    fetchOrders(activeFilter);
  }, [activeFilter, fetchOrders]);

  // Auto-refresh every 10 s while any order is in a live state
  useEffect(() => {
    const hasLive = orders.some((o) => o.status === 'OPTIMIZING' || o.status === 'CUTTING');
    if (!hasLive) return;

    const id = setInterval(() => fetchOrders(activeFilter), 10_000);
    return () => clearInterval(id);
  }, [orders, activeFilter, fetchOrders]);

  const requirementSummary = (order: WorkOrder) => {
    const pieces = order.requirements.reduce((acc, r) => acc + r.quantity, 0);
    const materials = new Set(order.requirements.map((r) => r.materialSku)).size;
    return `${pieces} pieza${pieces !== 1 ? 's' : ''}, ${materials} material${materials !== 1 ? 'es' : ''}`;
  };

  /**
   * Build a friendly display ID.
   * Seed IDs look like `wo_pending_001` / `wo_completed_042`.
   * We extract the trailing digit-group (pad to 4) and fall back to the
   * position in the list so the UI never shows status-words like "NDING_001".
   */
  const displayId = (order: WorkOrder, index: number): string => {
    const match = order.id.match(/(\d+)$/);
    const n = match ? parseInt(match[1], 10) : index + 1;
    return String(n).padStart(4, '0');
  };

  return (
    <>
      <TopBar
        title="Órdenes de Trabajo"
        subtitle="Optimización de corte y trazado de materiales"
      />

      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        className="p-4 sm:p-6 lg:p-8"
      >
        {/* Header row */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 hover:text-neutral-800"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3L5 7l4 4" />
            </svg>
            Volver
          </button>

          <button
            onClick={() => router.push('/dashboard/scm/work-orders/new')}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M7 2v10M2 7h10" />
            </svg>
            Nueva Orden
          </button>
        </div>

        {/* Filter tabs */}
        <div className="mb-5 flex items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 shadow-sm w-fit">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeFilter === tab.value
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState filter={activeFilter} />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-3"
          >
            <AnimatePresence mode="popLayout">
              {orders.map((order, index) => {
                const efficiency = order.cuttingPlan?.totalEfficiencyPct;
                return (
                  <motion.div
                    key={order.id}
                    variants={staggerItem}
                    layout
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-xl border border-neutral-200 bg-white shadow-sm"
                  >
                    <div className="flex items-center gap-4 px-5 py-4">
                      {/* Status badge */}
                      <StatusBadge status={order.status} />

                      {/* Order ID */}
                      <span className="font-mono text-sm font-medium text-neutral-700">
                        #{displayId(order, index)}
                      </span>

                      {/* Requirements summary */}
                      <span className="text-sm text-neutral-500">
                        {requirementSummary(order)}
                      </span>

                      {/* Efficiency badge (COMPLETED with plan) */}
                      {order.status === 'COMPLETED' && efficiency != null && (
                        <span className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-green-100 text-green-800">
                          {efficiency.toFixed(1)}% eficiencia
                        </span>
                      )}

                      {/* Spacer */}
                      <div className="flex-1" />

                      {/* Created date */}
                      <span className="text-xs text-neutral-400" suppressHydrationWarning>
                        {new Date(order.createdAt).toLocaleDateString('es-CL')}
                      </span>

                      {/* Detail button */}
                      <button
                        onClick={() => router.push(`/dashboard/scm/work-orders/${order.id}`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                      >
                        Ver detalles
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h6M7 4l2 2-2 2" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
