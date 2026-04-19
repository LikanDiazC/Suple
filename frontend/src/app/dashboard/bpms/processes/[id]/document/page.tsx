'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskRow {
  name: string;
  assigneeRole: string;
  status: string;
  completedAt: string | null;
}

interface WorkOrderDocument {
  orderNumber: string;
  processName: string;
  clientName: string;
  status: string;
  title: string;
  startedBy: string;
  createdAt: string;
  completedAt: string | null;
  tasks: TaskRow[];
  formData: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_ES: Record<string, string> = {
  ACTIVE:    'En progreso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  ERROR:     'Error',
};

const TASK_STATUS_ES: Record<string, string> = {
  PENDING:     'Pendiente',
  IN_PROGRESS: 'En progreso',
  COMPLETED:   'Completado',
  CANCELLED:   'Cancelado',
  OVERDUE:     'Vencida',
};

function formatDateLong(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CL', {
    day:    '2-digit',
    month:  'long',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Print styles — injected as a <style> tag so they work even with Tailwind
// ---------------------------------------------------------------------------

const PRINT_STYLES = `
@media print {
  .no-print { display: none !important; }
  body { background: white !important; }
  .print-page {
    max-width: 100% !important;
    margin: 0 !important;
    padding: 24px !important;
    box-shadow: none !important;
  }
  @page { margin: 20mm; }
}
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function WorkOrderDocumentPage({ params }: PageProps) {
  const [id, setId] = useState<string | null>(null);
  const [doc, setDoc] = useState<WorkOrderDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve params (Next 15 async params)
  useEffect(() => {
    params.then(({ id: resolvedId }) => setId(resolvedId));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/bpms/processes/${id}/document`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json() as Promise<WorkOrderDocument>;
      })
      .then((data) => setDoc(data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-sm text-neutral-500 animate-pulse">Generando documento…</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 p-8">
        <p className="text-sm font-semibold text-red-600">
          {error ?? 'No se pudo cargar el documento.'}
        </p>
        <Link
          href={`/dashboard/bpms/monitor`}
          className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          Volver al monitor
        </Link>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const formEntries = Object.entries(doc.formData).filter(
    ([, v]) => v !== null && v !== undefined && v !== '',
  );

  return (
    <>
      {/* Inject print styles */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      {/* Screen toolbar */}
      <div className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-200 bg-white px-6 py-3 shadow-sm">
        <Link
          href={`/dashboard/bpms/monitor`}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 1L2 6l6 5" />
          </svg>
          Volver
        </Link>
        <span className="text-sm text-neutral-400 flex-1">Vista previa del documento — {doc.orderNumber}</span>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Imprimir / Exportar PDF
        </button>
      </div>

      {/* Document body */}
      <div className="min-h-screen bg-neutral-100 py-8 print:bg-white print:py-0">
        <div
          className="print-page mx-auto max-w-2xl rounded-xl bg-white p-10 shadow-lg print:max-w-full print:rounded-none print:shadow-none"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="mb-8 flex items-start justify-between border-b border-neutral-200 pb-6">
            {/* Company logo placeholder */}
            <div className="flex flex-col gap-0.5">
              <span
                className="text-lg font-bold tracking-tight text-neutral-900"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                SUPLE
              </span>
              <span className="text-xs text-neutral-400">Sistema de Gestión</span>
            </div>

            {/* Document title */}
            <div className="text-right">
              <h1
                className="text-xl font-bold uppercase tracking-widest text-neutral-900"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                Orden de Trabajo
              </h1>
              <p className="mt-0.5 font-mono text-sm font-semibold text-neutral-700">
                {doc.orderNumber}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">Fecha: {today}</p>
            </div>
          </div>

          {/* ── Datos del proceso ───────────────────────────────────────── */}
          <section className="mb-8">
            <h2
              className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-500"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Datos del Proceso
            </h2>
            <div className="rounded-lg border border-neutral-200 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ['Proceso',          doc.processName],
                    ['Título',           doc.title],
                    ['Estado',           STATUS_ES[doc.status] ?? doc.status],
                    ['Iniciado por',     doc.startedBy],
                    ['Fecha de inicio',  formatDateLong(doc.createdAt)],
                    ...(doc.completedAt
                      ? [['Fecha de cierre', formatDateLong(doc.completedAt)] as [string, string]]
                      : []),
                    ...(doc.clientName
                      ? [['Cliente', doc.clientName] as [string, string]]
                      : []),
                  ].map(([label, value], idx) => (
                    <tr
                      key={label}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}
                    >
                      <td className="w-40 border-r border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                        {label}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-neutral-800">
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Progreso de tareas ──────────────────────────────────────── */}
          <section className="mb-8">
            <h2
              className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-500"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Progreso de Tareas
            </h2>
            {doc.tasks.length === 0 ? (
              <p className="text-sm text-neutral-400 italic">Sin tareas registradas.</p>
            ) : (
              <div className="rounded-lg border border-neutral-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Paso</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Responsable</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Estado</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Completado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.tasks.map((task, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}
                      >
                        <td className="border-r border-neutral-100 px-4 py-2.5 font-medium text-neutral-800">
                          {task.name}
                        </td>
                        <td className="border-r border-neutral-100 px-4 py-2.5 text-neutral-600">
                          {task.assigneeRole || '—'}
                        </td>
                        <td className="border-r border-neutral-100 px-4 py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            task.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-700'
                              : task.status === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-700'
                              : task.status === 'OVERDUE'
                              ? 'bg-red-100 text-red-700'
                              : task.status === 'CANCELLED'
                              ? 'bg-neutral-100 text-neutral-500'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {TASK_STATUS_ES[task.status] ?? task.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-neutral-500">
                          {formatDateShort(task.completedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Datos del formulario ────────────────────────────────────── */}
          {formEntries.length > 0 && (
            <section className="mb-10">
              <h2
                className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-500"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                Datos del Formulario
              </h2>
              <div className="rounded-lg border border-neutral-200 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {formEntries.map(([key, value], idx) => (
                      <tr
                        key={key}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}
                      >
                        <td className="w-40 border-r border-neutral-200 px-4 py-2.5 text-xs font-semibold capitalize text-neutral-500 uppercase tracking-wide">
                          {key.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-neutral-800">
                          {typeof value === 'boolean'
                            ? value ? 'Sí' : 'No'
                            : String(value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── Footer / Firmas ─────────────────────────────────────────── */}
          <div className="mt-12 border-t border-neutral-200 pt-8">
            <div className="grid grid-cols-2 gap-12">
              <div className="flex flex-col gap-1">
                <div className="h-px w-full bg-neutral-300" />
                <p className="mt-1 text-xs text-neutral-500">Responsable / Firma</p>
                <p className="text-xs text-neutral-400">Fecha: _______________</p>
              </div>
              <div className="flex flex-col gap-1">
                <div className="h-px w-full bg-neutral-300" />
                <p className="mt-1 text-xs text-neutral-500">Autorizado por / Firma</p>
                <p className="text-xs text-neutral-400">Fecha: _______________</p>
              </div>
            </div>

            <p className="mt-8 text-center text-[10px] text-neutral-400">
              Documento generado el {today} — {doc.orderNumber} — Suple Sistema de Gestión
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
