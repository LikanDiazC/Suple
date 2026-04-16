'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import TopBar from '../../../../presentation/components/layout/TopBar';
import {
  pageTransition,
  staggerContainer,
  staggerItem,
} from '../../../../presentation/animations/variants';
import type { FormField, Task, TaskStatus } from '../../../../types/bpms';
import { formatDate, hoursAgo } from '../../../../lib/formatters';
import {
  TASK_STATUS_BORDER  as STATUS_BORDER,
  TASK_STATUS_BADGE   as STATUS_BADGE,
  TASK_STATUS_LABELS  as STATUS_LABELS,
} from '../../../../lib/statusConfig';

const FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: 'Todas',       value: 'ALL' },
  { label: 'Pendientes',  value: 'PENDING' },
  { label: 'En Progreso', value: 'IN_PROGRESS' },
  { label: 'Vencidas',    value: 'OVERDUE' },
  { label: 'Completadas', value: 'COMPLETED' },
];

// ---------------------------------------------------------------------------
// Modal overlay variants
// ---------------------------------------------------------------------------

const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18 } },
  exit:    { opacity: 0, transition: { duration: 0.14 } },
};

const sheetVariants = {
  initial: { opacity: 0, scale: 0.97, y: 16 },
  animate: { opacity: 1, scale: 1,    y: 0,  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
  exit:    { opacity: 0, scale: 0.97, y: 12, transition: { duration: 0.16 } },
};

// ---------------------------------------------------------------------------
// Dynamic form field renderer
// ---------------------------------------------------------------------------

interface DynamicFieldProps {
  field: FormField;
  value: unknown;
  onChange: (id: string, value: unknown) => void;
}

function DynamicField({ field, value, onChange }: DynamicFieldProps) {
  const base =
    'w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 outline-none transition-all focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100';

  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          id={field.id}
          className={base}
          placeholder={field.placeholder ?? ''}
          required={field.required}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      );
    case 'number':
      return (
        <input
          type="number"
          id={field.id}
          className={base}
          placeholder={field.placeholder ?? ''}
          required={field.required}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      );
    case 'textarea':
      return (
        <textarea
          id={field.id}
          rows={3}
          className={`${base} resize-none`}
          placeholder={field.placeholder ?? ''}
          required={field.required}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      );
    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={field.id}
            className="h-4 w-4 rounded border-neutral-300 accent-primary-600"
            checked={Boolean(value)}
            onChange={(e) => onChange(field.id, e.target.checked)}
          />
          <label htmlFor={field.id} className="text-sm text-neutral-600">
            {field.label}
          </label>
        </div>
      );
    case 'select':
      return (
        <select
          id={field.id}
          className={base}
          required={field.required}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(field.id, e.target.value)}
        >
          <option value="">Seleccionar...</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case 'date':
      return (
        <input
          type="date"
          id={field.id}
          className={base}
          required={field.required}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// CompleteTaskModal
// ---------------------------------------------------------------------------

interface CompleteTaskModalProps {
  task: Task;
  formData: Record<string, unknown>;
  selectedOutcome: string;
  isSaving: boolean;
  onFieldChange: (id: string, value: unknown) => void;
  onOutcomeSelect: (outcome: string) => void;
  onSubmit: (outcome: string) => void;
  onClose: () => void;
}

function CompleteTaskModal({
  task,
  formData,
  selectedOutcome,
  isSaving,
  onFieldChange,
  onOutcomeSelect,
  onSubmit,
  onClose,
}: CompleteTaskModalProps) {
  const hasOutcomes = task.approvalOutcomes.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(hasOutcomes ? selectedOutcome : 'DONE');
  }

  return (
    <motion.div
      variants={overlayVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        variants={sheetVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-100 px-6 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Completar tarea</p>
            <h3 className="mt-1 text-base font-bold text-neutral-900">{task.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {task.form.length > 0 ? (
            task.form.map((field) => (
              <div key={field.id}>
                {field.type !== 'checkbox' && (
                  <label htmlFor={field.id} className="mb-1.5 block text-xs font-semibold text-neutral-600">
                    {field.label}
                    {field.required && <span className="ml-1 text-red-400">*</span>}
                  </label>
                )}
                <DynamicField
                  field={field}
                  value={formData[field.id]}
                  onChange={onFieldChange}
                />
              </div>
            ))
          ) : (
            <p className="text-sm text-neutral-400">Esta tarea no tiene formulario adicional.</p>
          )}

          {/* Outcomes or single submit */}
          {hasOutcomes ? (
            <div className="pt-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Resultado
              </p>
              <div className="flex flex-wrap gap-2">
                {task.approvalOutcomes.map((outcome) => {
                  const isSelected = selectedOutcome === outcome;
                  const isPositive = outcome.toLowerCase().includes('aprobad') || outcome.toLowerCase() === 'done';
                  const isDanger = outcome.toLowerCase().includes('rechaz');
                  let colorClass = isSelected
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400';
                  if (isSelected && isPositive) colorClass = 'bg-green-600 text-white border-green-600';
                  if (isSelected && isDanger)   colorClass = 'bg-red-600 text-white border-red-600';

                  return (
                    <button
                      key={outcome}
                      type="submit"
                      disabled={isSaving}
                      onClick={() => onOutcomeSelect(outcome)}
                      className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${colorClass} disabled:opacity-60`}
                    >
                      {isSaving && selectedOutcome === outcome ? (
                        <span className="flex items-center gap-1.5">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Guardando...
                        </span>
                      ) : (
                        outcome
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-3 border-t border-neutral-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-60 transition-colors"
              >
                {isSaving ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Guardando...
                  </>
                ) : (
                  'Completar'
                )}
              </button>
            </div>
          )}
        </form>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm border-l-4 border-l-neutral-200 p-5 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/2 rounded bg-neutral-100" />
          <div className="h-3 w-1/3 rounded bg-neutral-100" />
          <div className="h-3 w-2/5 rounded bg-neutral-100" />
        </div>
        <div className="h-6 w-20 rounded-full bg-neutral-100" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-8 w-20 rounded-lg bg-neutral-100" />
        <div className="h-8 w-28 rounded-lg bg-neutral-100" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Success toast
// ---------------------------------------------------------------------------

const toastVariants = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
  exit:    { opacity: 0, y: -12, transition: { duration: 0.18 } },
};

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function TasksPage() {
  const router = useRouter();

  const [tasks, setTasks]                 = useState<Task[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [statusFilter, setStatusFilter]   = useState('ALL');
  const [completeModal, setCompleteModal] = useState<Task | null>(null);
  const [formData, setFormData]           = useState<Record<string, unknown>>({});
  const [selectedOutcome, setSelectedOutcome] = useState('');
  const [isSaving, setIsSaving]           = useState(false);
  const [claimingId, setClaimingId]       = useState<string | null>(null);
  const [showToast, setShowToast]         = useState(false);

  // ---- fetch ----------------------------------------------------------------

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/bpms/tasks?userId=user&page=1&limit=50');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list: Task[] = Array.isArray(json) ? json : (json.data ?? []);
      setTasks(list);
    } catch (err) {
      console.error('[TasksPage] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // ---- derived counts -------------------------------------------------------

  const pendingCount = tasks.filter((t) => t.status === 'PENDING').length;
  const overdueCount = tasks.filter((t) => t.status === 'OVERDUE').length;

  const filtered = statusFilter === 'ALL'
    ? tasks
    : tasks.filter((t) => t.status === statusFilter);

  // ---- handlers -------------------------------------------------------------

  async function handleClaim(task: Task) {
    setClaimingId(task.id);
    try {
      await fetch(`/api/bpms/tasks/${task.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimedBy: 'user' }),
      });
      await fetchTasks();
    } finally {
      setClaimingId(null);
    }
  }

  function openCompleteModal(task: Task) {
    const initial: Record<string, unknown> = {};
    task.form.forEach((f) => { initial[f.id] = f.type === 'checkbox' ? false : ''; });
    setFormData(initial);
    setSelectedOutcome(task.approvalOutcomes[0] ?? '');
    setCompleteModal(task);
  }

  function handleFieldChange(id: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [id]: value }));
  }

  async function handleComplete(outcome: string) {
    if (!completeModal) return;
    setIsSaving(true);
    try {
      await fetch(`/api/bpms/tasks/${completeModal.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, submission: formData, completedBy: 'user' }),
      });
      setCompleteModal(null);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      await fetchTasks();
    } finally {
      setIsSaving(false);
    }
  }

  // ---- render ---------------------------------------------------------------

  return (
    <>
      <TopBar title="Mis Tareas" subtitle="Bandeja de tareas asignadas" />

      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        className="p-4 sm:p-6 lg:p-8"
      >
        {/* Header row */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold text-neutral-900">Bandeja de entrada</h2>
          {pendingCount > 0 && (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              {pendingCount} pendientes
            </span>
          )}
          {overdueCount > 0 && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
              {overdueCount} vencidas
            </span>
          )}
        </div>

        {/* Filter row */}
        <div className="mb-6 flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                statusFilter === opt.value
                  ? 'bg-neutral-900 text-white'
                  : 'border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Task list */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            variants={staggerItem}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white py-20 text-center"
          >
            <svg viewBox="0 0 64 64" fill="none" className="mb-4 h-16 w-16 text-neutral-200">
              <rect x="12" y="8"  width="40" height="48" rx="6" stroke="currentColor" strokeWidth="2" />
              <path d="M22 20h20M22 28h20M22 36h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="46" cy="46" r="10" fill="white" stroke="currentColor" strokeWidth="2" />
              <path d="M42 46l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-base font-semibold text-neutral-500">No tienes tareas asignadas</p>
            <p className="mt-1 text-sm text-neutral-400">
              {statusFilter === 'ALL'
                ? 'Tu bandeja está vacía por el momento.'
                : `No hay tareas con estado "${FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label}".`}
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-4"
          >
            {filtered.map((task) => {
              const isOverdue = task.status === 'OVERDUE';
              const borderColor = STATUS_BORDER[task.status] ?? 'border-l-neutral-300';

              return (
                <motion.div
                  key={task.id}
                  variants={staggerItem}
                  className={`rounded-xl border border-neutral-200 bg-white shadow-sm border-l-4 ${borderColor} p-5 transition-shadow hover:shadow-md ${isOverdue ? 'border-red-200' : ''}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    {/* Left: task info */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-sm font-bold text-neutral-900">{task.name}</p>

                      {task.assigneeRole && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">
                          👤 {task.assigneeRole}
                        </span>
                      )}

                      <button
                        onClick={() => router.push(`/dashboard/bpms/instances/${task.instanceId}`)}
                        className="text-xs text-neutral-400 hover:text-blue-600 transition-colors text-left"
                      >
                        Proceso:{' '}
                        <span className="font-mono text-neutral-600 hover:text-blue-600 underline-offset-2 hover:underline">
                          ...{task.instanceId.slice(-8)}
                        </span>
                      </button>

                      {/* SLA / due date */}
                      {task.dueDate && !isOverdue && (
                        <p className="text-xs text-neutral-500">
                          Vence: {formatDate(task.dueDate)}
                        </p>
                      )}
                      {isOverdue && task.dueDate && (
                        <p className="flex items-center gap-1 text-xs font-semibold text-red-600">
                          <span>⚠️</span>
                          VENCIDA hace {hoursAgo(task.dueDate)} horas
                        </p>
                      )}
                    </div>

                    {/* Right: status badge */}
                    <span
                      className={`shrink-0 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        STATUS_BADGE[task.status] ?? 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {STATUS_LABELS[task.status] ?? task.status}
                    </span>
                  </div>

                  {/* Action buttons */}
                  {(task.status === 'PENDING' || task.status === 'IN_PROGRESS' || task.status === 'OVERDUE') && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {task.status === 'PENDING' && (
                        <button
                          onClick={() => handleClaim(task)}
                          disabled={claimingId === task.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 transition-colors"
                        >
                          {claimingId === task.id ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
                          ) : null}
                          Tomar
                        </button>
                      )}
                      <button
                        onClick={() => openCompleteModal(task)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors ${
                          isOverdue
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-neutral-900 hover:bg-neutral-700'
                        }`}
                      >
                        Completar
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
                          <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>

      {/* Complete task modal */}
      <AnimatePresence>
        {completeModal && (
          <CompleteTaskModal
            task={completeModal}
            formData={formData}
            selectedOutcome={selectedOutcome}
            isSaving={isSaving}
            onFieldChange={handleFieldChange}
            onOutcomeSelect={setSelectedOutcome}
            onSubmit={handleComplete}
            onClose={() => setCompleteModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Success toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            variants={toastVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-3.5 shadow-xl"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
              <svg viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth={2.2} className="h-3.5 w-3.5">
                <path d="M2 7l4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-green-800">Tarea completada con exito</p>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
