'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import TopBar from '../../../../presentation/components/layout/TopBar';
import {
  pageTransition,
  staggerContainer,
  staggerItem,
} from '../../../../presentation/animations/variants';
import type { ProcessInstance, ProcessInstanceStatus, BpmsAnalytics } from '../../../../types/bpms';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const ALL_STATUSES = ['Todos', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ERROR'] as const;
type StatusFilter = typeof ALL_STATUSES[number];

const STATUS_STYLES: Record<ProcessInstanceStatus, { badge: string; dot: string; label: string }> = {
  ACTIVE:    { badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',     dot: 'bg-blue-500',    label: 'Activo'      },
  COMPLETED: { badge: 'bg-green-50 text-green-700 ring-1 ring-green-200',  dot: 'bg-green-500',   label: 'Completado'  },
  CANCELLED: { badge: 'bg-neutral-100 text-neutral-500 ring-1 ring-neutral-200', dot: 'bg-neutral-400', label: 'Cancelado'   },
  SUSPENDED: { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',  dot: 'bg-amber-500',   label: 'Suspendido'  },
  ERROR:     { badge: 'bg-red-50 text-red-700 ring-1 ring-red-200',        dot: 'bg-red-600',     label: 'Error'       },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function progressPercent(instance: ProcessInstance): number {
  const total = instance.completedNodeIds.length + instance.activeNodeIds.length;
  if (total === 0) return 0;
  return Math.round((instance.completedNodeIds.length / total) * 100);
}

function truncateId(id: string, maxLen = 12): string {
  return id.length > maxLen ? `${id.slice(0, maxLen)}…` : id;
}

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  ringClass: string;
}

function KpiCard({ label, value, icon, colorClass, bgClass, ringClass }: KpiCardProps) {
  return (
    <motion.div
      variants={staggerItem}
      className="rounded-xl border border-neutral-200 bg-white shadow-sm p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-neutral-900">{value}</p>
        </div>
        <div className={`rounded-lg p-2 ring-1 ${bgClass} ${ringClass} ${colorClass}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Instance card
// ---------------------------------------------------------------------------

interface InstanceCardProps {
  instance: ProcessInstance;
  onNavigate: () => void;
  onCancel: () => void;
}

function InstanceCard({ instance, onNavigate, onCancel }: InstanceCardProps) {
  const style = STATUS_STYLES[instance.status] ?? STATUS_STYLES.ERROR;
  const progress = progressPercent(instance);

  return (
    <motion.div
      variants={staggerItem}
      className="rounded-xl border border-neutral-200 bg-white shadow-sm p-5"
    >
      <div className="flex items-start gap-4">
        {/* Status dot */}
        <div className="mt-1 shrink-0 flex flex-col items-center gap-1">
          {instance.status === 'ACTIVE' ? (
            <span className="relative flex h-3 w-3">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${style.dot} opacity-60`} />
              <span className={`relative inline-flex h-3 w-3 rounded-full ${style.dot}`} />
            </span>
          ) : (
            <span className={`h-3 w-3 rounded-full ${style.dot}`} />
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-neutral-900 leading-snug">{instance.title}</p>
              <p className="mt-0.5 text-xs text-neutral-400">
                Definición: {instance.definitionId}
              </p>
            </div>
            <span className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${style.badge}`}>
              {style.label}
            </span>
          </div>

          {/* Progress bar */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">Progreso</span>
              <span className="text-[11px] font-medium text-neutral-600">{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400">
            <span>Iniciado por <span className="font-medium text-neutral-600">{instance.startedBy}</span></span>
            <span>{formatDate(instance.startedAt)}</span>
            {instance.completedAt && (
              <span>Completado: {formatDate(instance.completedAt)}</span>
            )}
          </div>

          {/* Active nodes */}
          {instance.activeNodeIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {instance.activeNodeIds.map((nodeId) => (
                <span
                  key={nodeId}
                  className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200"
                >
                  {truncateId(nodeId)}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onNavigate}
              className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              Ver detalles
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 6h8M6 2l4 4-4 4" />
              </svg>
            </button>
            {instance.status === 'ACTIVE' && (
              <button
                onClick={onCancel}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MonitorPage() {
  const router = useRouter();

  const [instances, setInstances] = useState<ProcessInstance[]>([]);
  const [analytics, setAnalytics] = useState<BpmsAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [instancesRes, analyticsRes] = await Promise.all([
        fetch('/api/bpms/instances'),
        fetch('/api/bpms/analytics'),
      ]);
      if (instancesRes.ok) {
        const data = await instancesRes.json();
        setInstances(Array.isArray(data) ? data : (data.data ?? []));
      }
      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json());
      }
    } catch (err) {
      console.error('[MonitorPage] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  async function handleCancel(id: string) {
    if (!confirm('¿Cancelar esta instancia? Esta acción no se puede deshacer.')) return;
    try {
      await fetch(`/api/bpms/instances/${id}/cancel`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      console.error('[MonitorPage] cancel error:', err);
    }
  }

  // Status counts
  const countByStatus = (status: ProcessInstanceStatus) =>
    instances.filter((i) => i.status === status).length;

  // Filtered instances
  const filtered = instances.filter((i) =>
    statusFilter === 'Todos' ? true : i.status === statusFilter
  );

  // KPI cards config
  const kpiCards: KpiCardProps[] = [
    {
      label: 'Instancias activas',
      value: isLoading ? '—' : (analytics?.activeInstances ?? countByStatus('ACTIVE')),
      colorClass: 'text-blue-600',
      bgClass: 'bg-blue-50',
      ringClass: 'ring-blue-100',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: 'Completadas hoy',
      value: isLoading ? '—' : (analytics?.completedToday ?? countByStatus('COMPLETED')),
      colorClass: 'text-green-600',
      bgClass: 'bg-green-50',
      ringClass: 'ring-green-100',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" />
          <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: 'Canceladas',
      value: isLoading ? '—' : countByStatus('CANCELLED'),
      colorClass: 'text-neutral-500',
      bgClass: 'bg-neutral-100',
      ringClass: 'ring-neutral-200',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
          <circle cx="12" cy="12" r="9" />
          <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: 'T. medio finalización',
      value: isLoading ? '—' : '2.4h',
      colorClass: 'text-amber-600',
      bgClass: 'bg-amber-50',
      ringClass: 'ring-amber-100',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
          <circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <TopBar title="Monitor BPMS" subtitle="Seguimiento de instancias y rendimiento" />

      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        className="p-8"
      >
        {/* KPI row */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {kpiCards.map((card) => (
            <KpiCard key={card.label} {...card} />
          ))}
        </motion.div>

        {/* Status filter + refresh indicator */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
            {ALL_STATUSES.map((s) => {
              const count = s === 'Todos' ? instances.length : instances.filter((i) => i.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {s === 'Todos' ? 'Todos' : s.charAt(0) + s.slice(1).toLowerCase()}
                  <span className={`inline-flex items-center justify-center rounded-full min-w-[18px] px-1 text-[10px] font-bold ${
                    statusFilter === s ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-1.5 text-xs text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Auto-actualización cada 15s
          </div>
        </div>

        {/* Instances list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-neutral-200 bg-white p-5 h-32" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 py-20 text-center"
            >
              <span className="text-4xl">📡</span>
              <p className="mt-3 text-sm font-medium text-neutral-500">No hay instancias{statusFilter !== 'Todos' ? ` con estado ${statusFilter}` : ''}</p>
              <p className="mt-1 text-xs text-neutral-400">El monitor se actualiza automáticamente cada 15 segundos.</p>
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-3"
          >
            {filtered.map((instance) => (
              <InstanceCard
                key={instance.id}
                instance={instance}
                onNavigate={() => router.push(`/dashboard/bpms/instances/${instance.id}`)}
                onCancel={() => handleCancel(instance.id)}
              />
            ))}
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
