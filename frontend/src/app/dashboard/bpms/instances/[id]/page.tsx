'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import TopBar from '../../../../../presentation/components/layout/TopBar';
import {
  pageTransition,
  staggerContainer,
  staggerItem,
} from '../../../../../presentation/animations/variants';
import type { ProcessInstance, ProcessInstanceStatus, Task, TaskStatus } from '../../../../../types/bpms';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Status config — instance
// ---------------------------------------------------------------------------

const INSTANCE_BADGE: Record<ProcessInstanceStatus, string> = {
  ACTIVE:    'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-neutral-100 text-neutral-500',
  SUSPENDED: 'bg-amber-50 text-amber-700',
  ERROR:     'bg-red-50 text-red-700',
};

const INSTANCE_LABELS: Record<ProcessInstanceStatus, string> = {
  ACTIVE:    'Activo',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  SUSPENDED: 'Suspendido',
  ERROR:     'Error',
};

// ---------------------------------------------------------------------------
// Status config — task
// ---------------------------------------------------------------------------

const TASK_BADGE: Record<TaskStatus, string> = {
  PENDING:     'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  OVERDUE:     'bg-red-50 text-red-700',
  COMPLETED:   'bg-green-50 text-green-700',
  CANCELLED:   'bg-neutral-100 text-neutral-500',
};

const TASK_LABELS: Record<TaskStatus, string> = {
  PENDING:     'Pendiente',
  IN_PROGRESS: 'En progreso',
  OVERDUE:     'Vencida',
  COMPLETED:   'Completada',
  CANCELLED:   'Cancelada',
};

// ---------------------------------------------------------------------------
// Cancel confirm dialog variants
// ---------------------------------------------------------------------------

const overlayV = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18 } },
  exit:    { opacity: 0, transition: { duration: 0.14 } },
};

const dialogV = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: { opacity: 1, scale: 1,   y: 0,  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
  exit:    { opacity: 0, scale: 0.96, y: 8,  transition: { duration: 0.14 } },
};

// ---------------------------------------------------------------------------
// Pulse dot for active nodes
// ---------------------------------------------------------------------------

function PulseDot({ color = 'bg-blue-500' }: { color?: string }) {
  return (
    <span className="relative inline-flex h-4 w-4">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-40`} />
      <span className={`relative inline-flex h-4 w-4 rounded-full ${color}`} />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Skeleton helpers
// ---------------------------------------------------------------------------

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-neutral-100 ${className ?? 'h-4 w-full'}`} />;
}

// ---------------------------------------------------------------------------
// Collapsible JSON viewer
// ---------------------------------------------------------------------------

function JsonViewer({ data }: { data: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const isEmpty = Object.keys(data).length === 0;

  if (isEmpty) {
    return <p className="text-xs text-neutral-400 italic">Sin variables</p>;
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
        >
          <path d="M5 3l6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {open ? 'Ocultar' : 'Ver'} variables ({Object.keys(data).length})
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto', transition: { duration: 0.2 } }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
            className="overflow-hidden"
          >
            <pre className="mt-2 overflow-auto rounded-lg bg-neutral-50 p-3 text-[11px] leading-relaxed text-neutral-700 border border-neutral-100">
              {JSON.stringify(data, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Process timeline builder
// ---------------------------------------------------------------------------

interface TimelineNode {
  id: string;
  state: 'completed' | 'active' | 'pending';
}

function buildTimeline(instance: ProcessInstance): TimelineNode[] {
  const nodes: TimelineNode[] = [];
  const seen = new Set<string>();

  instance.completedNodeIds.forEach((id) => {
    if (!seen.has(id)) { nodes.push({ id, state: 'completed' }); seen.add(id); }
  });
  instance.activeNodeIds.forEach((id) => {
    if (!seen.has(id)) { nodes.push({ id, state: 'active' }); seen.add(id); }
  });

  return nodes;
}

function nodeLabel(id: string): string {
  return id
    .replace(/^node-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function InstanceDetailPage() {
  const router    = useRouter();
  const params    = useParams();
  const instanceId = params.id as string;

  const [instance, setInstance]       = useState<ProcessInstance | null>(null);
  const [tasks, setTasks]             = useState<Task[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- fetch ----------------------------------------------------------------

  const fetchInstance = useCallback(async () => {
    try {
      const res = await fetch(`/api/bpms/instances/${instanceId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ProcessInstance = await res.json();
      setInstance(data);
      return data;
    } catch (err) {
      console.error('[InstanceDetailPage] fetchInstance error:', err);
      return null;
    }
  }, [instanceId]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/bpms/tasks?instanceId=${instanceId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setTasks(Array.isArray(json) ? json : (json.data ?? []));
    } catch (err) {
      console.error('[InstanceDetailPage] fetchTasks error:', err);
    }
  }, [instanceId]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const inst = await fetchInstance();
      await fetchTasks();
      setIsLoading(false);

      // auto-refresh every 8 s while ACTIVE
      if (inst?.status === 'ACTIVE') {
        intervalRef.current = setInterval(async () => {
          const updated = await fetchInstance();
          await fetchTasks();
          if (updated?.status !== 'ACTIVE' && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }, 8000);
      }
    }

    init();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchInstance, fetchTasks]);

  // ---- cancel ---------------------------------------------------------------

  async function handleCancel() {
    if (!instance) return;
    setIsCancelling(true);
    try {
      await fetch(`/api/bpms/instances/${instance.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelado manualmente', cancelledBy: 'user' }),
      });
      setShowCancelDialog(false);
      await fetchInstance();
    } finally {
      setIsCancelling(false);
    }
  }

  // ---- render: loading -------------------------------------------------------

  if (isLoading) {
    return (
      <>
        <TopBar title="Instancia de Proceso" subtitle="Seguimiento y auditoría del flujo" />
        <div className="p-8 space-y-6">
          <SkeletonBlock className="h-8 w-64" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4">
              {[120, 80, 100].map((h, i) => (
                <SkeletonBlock key={i} className={`h-${h === 120 ? '32' : h === 80 ? '20' : '28'} w-full rounded-xl`} />
              ))}
            </div>
            <div className="lg:col-span-2">
              <SkeletonBlock className="h-64 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </>
    );
  }

  // ---- render: not found ----------------------------------------------------

  if (!instance) {
    return (
      <>
        <TopBar title="Instancia de Proceso" subtitle="Seguimiento y auditoría del flujo" />
        <div className="flex flex-col items-center justify-center p-20 text-center">
          <p className="text-lg font-semibold text-neutral-500">Instancia no encontrada</p>
          <button
            onClick={() => router.push('/dashboard/bpms/monitor')}
            className="mt-4 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            ← Volver al Monitor
          </button>
        </div>
      </>
    );
  }

  const timeline = buildTimeline(instance);

  // ---- render: main ---------------------------------------------------------

  return (
    <>
      <TopBar title="Instancia de Proceso" subtitle="Seguimiento y auditoría del flujo" />

      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        className="p-8"
      >
        {/* Header row */}
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/bpms/monitor')}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
              <path d="M10 3L4 8l6 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Monitor
          </button>

          <h2 className="flex-1 text-xl font-bold text-neutral-900">{instance.title}</h2>

          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              INSTANCE_BADGE[instance.status] ?? 'bg-neutral-100 text-neutral-500'
            }`}
          >
            {INSTANCE_LABELS[instance.status] ?? instance.status}
          </span>

          {instance.status === 'ACTIVE' && (
            <button
              onClick={() => setShowCancelDialog(true)}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors"
            >
              Cancelar proceso
            </button>
          )}
        </div>

        {/* Two-column layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Left column ─────────────────────────────────────────────── */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="lg:col-span-1 space-y-4"
          >
            {/* Info card */}
            <motion.div variants={staggerItem} className="rounded-xl border border-neutral-200 bg-white shadow-sm p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Informacion</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-neutral-500">Proceso</span>
                  <span className="font-mono text-xs text-neutral-700">...{instance.definitionId.slice(-8)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-neutral-500">Iniciado por</span>
                  <span className="font-medium text-neutral-800">{instance.startedBy}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-neutral-500">Inicio</span>
                  <span className="text-neutral-700">{formatDate(instance.startedAt)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-neutral-500">Completado</span>
                  <span className="text-neutral-700">{formatDate(instance.completedAt)}</span>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-3">
                <JsonViewer data={instance.variables} />
              </div>
            </motion.div>

            {/* Active nodes card */}
            <motion.div variants={staggerItem} className="rounded-xl border border-neutral-200 bg-white shadow-sm p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Nodos activos ({instance.activeNodeIds.length})
              </h3>
              {instance.activeNodeIds.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">Sin nodos activos</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {instance.activeNodeIds.map((nodeId) => (
                    <span
                      key={nodeId}
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                    >
                      <PulseDot color="bg-blue-500" />
                      <span className="font-mono">...{nodeId.slice(-8)}</span>
                    </span>
                  ))}
                </div>
              )}
            </motion.div>

            {/* History card */}
            <motion.div variants={staggerItem} className="rounded-xl border border-neutral-200 bg-white shadow-sm p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Historial ({instance.completedNodeIds.length})
              </h3>
              {instance.completedNodeIds.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">Sin nodos completados</p>
              ) : (
                <ul className="space-y-2">
                  {instance.completedNodeIds.map((nodeId, idx) => (
                    <li key={`${nodeId}-${idx}`} className="flex items-center gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                        <svg viewBox="0 0 12 12" fill="none" stroke="#16a34a" strokeWidth={2} className="h-3 w-3">
                          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span className="font-mono text-xs text-neutral-700">...{nodeId.slice(-8)}</span>
                      <span className="text-[10px] text-neutral-400">completado</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </motion.div>

          {/* ── Right column ────────────────────────────────────────────── */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="lg:col-span-2 space-y-6"
          >
            {/* Visual timeline */}
            <motion.div variants={staggerItem} className="rounded-xl border border-neutral-200 bg-white shadow-sm p-6">
              <h3 className="mb-5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Linea de tiempo del proceso
              </h3>

              {timeline.length === 0 ? (
                <p className="text-sm text-neutral-400 italic">Sin historial de nodos disponible</p>
              ) : (
                <ol className="relative space-y-0">
                  {/* Vertical line */}
                  <div className="absolute left-[1.125rem] top-2 bottom-2 w-px bg-neutral-200" aria-hidden="true" />

                  {timeline.map((node, idx) => {
                    const isCompleted = node.state === 'completed';
                    const isActive    = node.state === 'active';

                    return (
                      <motion.li
                        key={`${node.id}-${idx}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.06, duration: 0.22 } }}
                        className="relative flex items-start gap-4 pb-6 last:pb-0"
                      >
                        {/* Node dot */}
                        <div className="z-10 mt-0.5 shrink-0">
                          {isCompleted && (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 border-2 border-green-300">
                              <svg viewBox="0 0 14 14" fill="none" stroke="#16a34a" strokeWidth={2.2} className="h-4 w-4">
                                <path d="M2 7l4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          )}
                          {isActive && (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 border-2 border-blue-400">
                              <PulseDot color="bg-blue-500" />
                            </div>
                          )}
                          {node.state === 'pending' && (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 border-2 border-neutral-200">
                              <div className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                            </div>
                          )}
                        </div>

                        {/* Node label */}
                        <div className="pt-1.5">
                          <p
                            className={`text-sm font-semibold ${
                              isCompleted
                                ? 'text-neutral-800'
                                : isActive
                                ? 'text-blue-700'
                                : 'text-neutral-400'
                            }`}
                          >
                            {nodeLabel(node.id)}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-neutral-400">
                            {node.id}
                          </p>
                          {isCompleted && (
                            <span className="mt-1 inline-flex text-[10px] font-medium text-green-600">
                              Completado
                            </span>
                          )}
                          {isActive && (
                            <span className="mt-1 inline-flex text-[10px] font-medium text-blue-600">
                              En ejecucion
                            </span>
                          )}
                        </div>
                      </motion.li>
                    );
                  })}
                </ol>
              )}
            </motion.div>

            {/* Associated tasks */}
            <motion.div variants={staggerItem} className="rounded-xl border border-neutral-200 bg-white shadow-sm p-6">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Tareas asociadas ({tasks.length})
              </h3>

              {tasks.length === 0 ? (
                <p className="text-sm text-neutral-400 italic">Sin tareas vinculadas a esta instancia</p>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-semibold text-neutral-800">{task.name}</p>
                        <p className="text-xs text-neutral-400">
                          Nodo:{' '}
                          <span className="font-mono">{task.nodeId}</span>
                          {task.assigneeRole && (
                            <span className="ml-2 text-neutral-500">· {task.assigneeRole}</span>
                          )}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          TASK_BADGE[task.status] ?? 'bg-neutral-100 text-neutral-500'
                        }`}
                      >
                        {TASK_LABELS[task.status] ?? task.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Cancel confirmation dialog */}
      <AnimatePresence>
        {showCancelDialog && (
          <motion.div
            variants={overlayV}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowCancelDialog(false); }}
          >
            <motion.div
              variants={dialogV}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-100">
                <svg viewBox="0 0 20 20" fill="none" stroke="#dc2626" strokeWidth={1.8} className="h-5 w-5">
                  <path d="M10 6v4M10 14h.01M3.1 16.9A9 9 0 1 0 16.9 3.1 9 9 0 0 0 3.1 16.9z" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-neutral-900">Cancelar proceso</h3>
              <p className="mt-2 text-sm text-neutral-500">
                Esta accion no se puede deshacer. El proceso y todas sus tareas activas seran cancelados.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  disabled={isCancelling}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 transition-colors"
                >
                  Volver
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  {isCancelling && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  Si, cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
