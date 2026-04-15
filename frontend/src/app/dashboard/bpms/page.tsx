'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import TopBar from '../../../presentation/components/layout/TopBar';
import {
  pageTransition,
  staggerContainer,
  staggerItem,
} from '../../../presentation/animations/variants';
import type { BpmsAnalytics, ProcessInstance } from '../../../types/bpms';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

function IconNodes() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
      <circle cx="5" cy="12" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M7 12h4m4-4.5L11 12m8 4-4-4.5" strokeLinecap="round" />
    </svg>
  );
}

function IconChecklist() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeLinecap="round" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 17h6" strokeLinecap="round" />
    </svg>
  );
}

function IconList() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

import { formatDateShort as formatDate } from '../../../lib/formatters';
import {
  INSTANCE_STATUS_BADGE  as INSTANCE_STATUS_STYLES,
  INSTANCE_STATUS_LABELS,
} from '../../../lib/statusConfig';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BpmsHubPage() {
  const router = useRouter();

  const [analytics, setAnalytics] = useState<BpmsAnalytics | null>(null);
  const [instances, setInstances] = useState<ProcessInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [analyticsRes, instancesRes] = await Promise.all([
          fetch('/api/bpms/analytics'),
          fetch('/api/bpms/instances'),
        ]);

        if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
        if (instancesRes.ok) {
          const data = await instancesRes.json();
          // Accept both array and paginated { data: [...] } shapes
          setInstances(Array.isArray(data) ? data.slice(0, 5) : (data.data ?? []).slice(0, 5));
        }
      } catch (err) {
        console.error('[BpmsHubPage] fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // KPI cards configuration
  const kpiCards = [
    {
      label: 'Instancias activas',
      value: analytics?.activeInstances ?? '—',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" strokeLinecap="round" />
        </svg>
      ),
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      ring: 'ring-blue-100',
    },
    {
      label: 'Tareas pendientes',
      value: analytics?.pendingTasks ?? '—',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeLinecap="round" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
        </svg>
      ),
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      ring: 'ring-amber-100',
    },
    {
      label: 'Tareas vencidas',
      value: analytics?.overdueTasks ?? '—',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
          <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
        </svg>
      ),
      color: 'text-red-600',
      bg: 'bg-red-50',
      ring: 'ring-red-100',
    },
    {
      label: 'Completadas hoy',
      value: analytics?.completedToday ?? '—',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" />
          <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      color: 'text-green-600',
      bg: 'bg-green-50',
      ring: 'ring-green-100',
    },
  ];

  // Quick actions
  const quickActions: QuickAction[] = [
    {
      label: 'Diseñador',
      description: 'Crear y editar definiciones de procesos',
      href: '/dashboard/bpms/designer',
      icon: <IconNodes />,
      color: 'text-violet-600',
    },
    {
      label: 'Mis Tareas',
      description: 'Ver y completar tareas asignadas',
      href: '/dashboard/bpms/tasks',
      icon: <IconChecklist />,
      color: 'text-blue-600',
    },
    {
      label: 'Procesos',
      description: 'Gestionar definiciones de procesos',
      href: '/dashboard/bpms/processes',
      icon: <IconList />,
      color: 'text-indigo-600',
    },
    {
      label: 'Monitor',
      description: 'Monitorear instancias en tiempo real',
      href: '/dashboard/bpms/monitor',
      icon: <IconActivity />,
      color: 'text-emerald-600',
    },
  ];

  return (
    <>
      <TopBar
        title="BPMS"
        subtitle="Business Process Management — Flujos y automatización"
      />

      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        className="p-8"
      >
        {/* KPI Row */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {kpiCards.map((card, i) => (
            <motion.div
              key={card.label}
              variants={staggerItem}
              custom={i}
              className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-neutral-900">
                    {loading ? (
                      <span className="inline-block h-8 w-12 animate-pulse rounded bg-neutral-100" />
                    ) : (
                      card.value
                    )}
                  </p>
                </div>
                <div
                  className={`rounded-lg p-2 ring-1 ${card.bg} ${card.ring} ${card.color}`}
                >
                  {card.icon}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Accesos rápidos
          </h2>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {quickActions.map((action, i) => (
              <motion.button
                key={action.href}
                variants={staggerItem}
                custom={i}
                whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(action.href)}
                className="flex flex-col items-start gap-3 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-colors hover:border-neutral-300 text-left"
              >
                <div className={`${action.color}`}>{action.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-neutral-800">{action.label}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">{action.description}</p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Actividad reciente
          </h2>
          <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="space-y-0 divide-y divide-neutral-50">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4">
                    <div className="h-4 w-24 animate-pulse rounded bg-neutral-100" />
                    <div className="h-4 flex-1 animate-pulse rounded bg-neutral-100" />
                    <div className="h-4 w-16 animate-pulse rounded bg-neutral-100" />
                  </div>
                ))}
              </div>
            ) : instances.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-neutral-400">
                No hay instancias recientes
              </div>
            ) : (
              <motion.ul
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="divide-y divide-neutral-50"
              >
                {instances.map((inst) => (
                  <motion.li
                    key={inst.id}
                    variants={staggerItem}
                    className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-neutral-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/bpms/monitor`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          INSTANCE_STATUS_STYLES[inst.status] ?? 'bg-neutral-100 text-neutral-500'
                        }`}
                      >
                        {INSTANCE_STATUS_LABELS[inst.status] ?? inst.status}
                      </span>
                      <span className="truncate text-sm font-medium text-neutral-800">
                        {inst.title}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {formatDate(inst.startedAt)}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
