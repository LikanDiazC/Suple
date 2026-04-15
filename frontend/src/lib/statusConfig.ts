/**
 * Centralized status badge/label configs for BPMS and SCM.
 * Replaces 6+ duplicate color-map objects scattered across pages.
 */

import type { ProcessInstanceStatus, TaskStatus } from '../types/bpms';

// ── Task statuses ────────────────────────────────────────────────────────────

export const TASK_STATUS_BORDER: Record<TaskStatus, string> = {
  PENDING:     'border-l-blue-400',
  IN_PROGRESS: 'border-l-amber-400',
  OVERDUE:     'border-l-red-500',
  COMPLETED:   'border-l-green-400',
  CANCELLED:   'border-l-neutral-300',
};

export const TASK_STATUS_BADGE: Record<TaskStatus, string> = {
  PENDING:     'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  OVERDUE:     'bg-red-50 text-red-700',
  COMPLETED:   'bg-green-50 text-green-700',
  CANCELLED:   'bg-neutral-100 text-neutral-500',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING:     'Pendiente',
  IN_PROGRESS: 'En progreso',
  OVERDUE:     'Vencida',
  COMPLETED:   'Completada',
  CANCELLED:   'Cancelada',
};

// ── Instance statuses ────────────────────────────────────────────────────────

export const INSTANCE_STATUS_BADGE: Record<ProcessInstanceStatus, string> = {
  ACTIVE:    'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-neutral-100 text-neutral-500',
  SUSPENDED: 'bg-amber-50 text-amber-700',
  ERROR:     'bg-red-50 text-red-700',
};

export const INSTANCE_STATUS_LABELS: Record<ProcessInstanceStatus, string> = {
  ACTIVE:    'Activo',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  SUSPENDED: 'Suspendido',
  ERROR:     'Error',
};

/** Extended style object used by the monitor page (includes ring + dot color). */
export const INSTANCE_STATUS_STYLES: Record<
  ProcessInstanceStatus,
  { badge: string; dot: string; label: string }
> = {
  ACTIVE:    { badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',      dot: 'bg-blue-500',    label: 'Activo'     },
  COMPLETED: { badge: 'bg-green-50 text-green-700 ring-1 ring-green-200',   dot: 'bg-green-500',   label: 'Completado' },
  CANCELLED: { badge: 'bg-neutral-100 text-neutral-500 ring-1 ring-neutral-200', dot: 'bg-neutral-400', label: 'Cancelado'  },
  SUSPENDED: { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',   dot: 'bg-amber-500',   label: 'Suspendido' },
  ERROR:     { badge: 'bg-red-50 text-red-700 ring-1 ring-red-200',         dot: 'bg-red-600',     label: 'Error'      },
};
