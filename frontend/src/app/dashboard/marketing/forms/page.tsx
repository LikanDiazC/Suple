'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '../../../../presentation/components/layout/TopBar';
import { pageTransition, staggerContainer, staggerItem } from '../../../../presentation/animations/variants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FormFieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select';

interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
}

interface MarketingForm {
  id: string;
  name: string;
  description?: string;
  fields: FormField[];
  status: 'ACTIVE' | 'INACTIVE';
  response_count: number;
  created_at: string;
  updated_at: string;
}

interface FormResponse {
  id: string;
  form_id: string;
  data: Record<string, unknown>;
  submitted_at: string;
  ip_address?: string;
  source?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(iso));
}

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text:     'Texto',
  email:    'Email',
  phone:    'Teléfono',
  textarea: 'Párrafo',
  select:   'Selección',
};

const EMPTY_FIELD = (): FormField => ({
  id: generateId(),
  label: '',
  type: 'text',
  required: false,
  options: [],
});

// ---------------------------------------------------------------------------
// FieldRow
// ---------------------------------------------------------------------------

interface FieldRowProps {
  field: FormField;
  index: number;
  total: number;
  onChange: (field: FormField) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function FieldRow({ field, index, total, onChange, onRemove, onMoveUp, onMoveDown }: FieldRowProps) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        {/* Reorder buttons */}
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button
            type="button"
            disabled={index === 0}
            onClick={onMoveUp}
            className="p-0.5 rounded text-neutral-400 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Mover arriba"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 9l4-4 4 4" />
            </svg>
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={onMoveDown}
            className="p-0.5 rounded text-neutral-400 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Mover abajo"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 5l4 4 4-4" />
            </svg>
          </button>
        </div>

        {/* Label */}
        <input
          type="text"
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          placeholder="Etiqueta del campo"
          className="flex-1 min-w-0 rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />

        {/* Type selector */}
        <select
          value={field.type}
          onChange={(e) => onChange({ ...field, type: e.target.value as FormFieldType })}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm bg-white focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          {(Object.entries(FIELD_TYPE_LABELS) as [FormFieldType, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {/* Required toggle */}
        <label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onChange({ ...field, required: e.target.checked })}
            className="rounded"
          />
          Requerido
        </label>

        {/* Remove */}
        <button
          type="button"
          onClick={onRemove}
          className="p-1 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0 transition-colors"
          aria-label="Eliminar campo"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 3l8 8M11 3L3 11" />
          </svg>
        </button>
      </div>

      {/* Options for select type */}
      {field.type === 'select' && (
        <div className="pl-8">
          <p className="text-xs text-neutral-500 mb-1">Opciones (una por línea):</p>
          <textarea
            rows={3}
            value={(field.options ?? []).join('\n')}
            onChange={(e) =>
              onChange({ ...field, options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })
            }
            placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
            className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NewFormModal
// ---------------------------------------------------------------------------

interface NewFormModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function NewFormModal({ onClose, onCreated }: NewFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([EMPTY_FIELD()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (idx: number, updated: FormField) =>
    setFields((f) => f.map((x, i) => (i === idx ? updated : x)));
  const removeField = (idx: number) =>
    setFields((f) => f.filter((_, i) => i !== idx));
  const moveUp = (idx: number) =>
    setFields((f) => { const a = [...f]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a; });
  const moveDown = (idx: number) =>
    setFields((f) => { const a = [...f]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a; });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es requerido'); return; }
    if (fields.some((f) => !f.label.trim())) { setError('Todos los campos deben tener etiqueta'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/marketing/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, fields }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || res.statusText);
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear formulario');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-neutral-900">Nuevo formulario</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l10 10M14 4L4 14" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Formulario de contacto"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Descripción
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción breve del formulario"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>

          {/* Fields builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-neutral-700">
                Campos
              </label>
              <span className="text-xs text-neutral-400">{fields.length} campo{fields.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  index={idx}
                  total={fields.length}
                  onChange={(updated) => updateField(idx, updated)}
                  onRemove={() => removeField(idx)}
                  onMoveUp={() => moveUp(idx)}
                  onMoveDown={() => moveDown(idx)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setFields((f) => [...f, EMPTY_FIELD()])}
              className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-500 hover:border-primary-400 hover:text-primary-600 transition-colors w-full justify-center"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M7 2v10M2 7h10" />
              </svg>
              Agregar campo
            </button>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Creando...' : 'Crear formulario'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResponsesPanel
// ---------------------------------------------------------------------------

interface ResponsesPanelProps {
  form: MarketingForm;
  onClose: () => void;
}

function ResponsesPanel({ form, onClose }: ResponsesPanelProps) {
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const LIMIT = 20;

  const fetchResponses = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketing/forms/${form.id}/responses?page=${p}&limit=${LIMIT}`);
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json() as { items: FormResponse[]; total: number };
      setResponses(json.items);
      setTotal(json.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar respuestas');
    } finally {
      setLoading(false);
    }
  }, [form.id]);

  useEffect(() => { fetchResponses(page); }, [fetchResponses, page]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Respuestas</h2>
            <p className="text-sm text-neutral-500">{form.name} · {total} respuesta{total !== 1 ? 's' : ''}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l10 10M14 4L4 14" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          )}

          {!loading && !error && responses.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-neutral-400">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              </div>
              <p className="text-sm font-medium text-neutral-500">Sin respuestas aún</p>
              <p className="text-xs text-neutral-400 mt-1">Las respuestas aparecerán aquí una vez que el formulario sea completado.</p>
            </div>
          )}

          {!loading && !error && responses.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-2 pr-4 font-medium text-neutral-500 text-xs uppercase tracking-wide whitespace-nowrap">
                      Fecha
                    </th>
                    {form.fields.map((f) => (
                      <th key={f.id} className="text-left py-2 pr-4 font-medium text-neutral-500 text-xs uppercase tracking-wide">
                        {f.label}
                      </th>
                    ))}
                    <th className="text-left py-2 font-medium text-neutral-500 text-xs uppercase tracking-wide">
                      Origen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r) => (
                    <tr key={r.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap text-xs">
                        {new Intl.DateTimeFormat('es-CL', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        }).format(new Date(r.submitted_at))}
                      </td>
                      {form.fields.map((f) => (
                        <td key={f.id} className="py-2.5 pr-4 text-neutral-700 max-w-[200px] truncate">
                          {String(r.data[f.id] ?? r.data[f.label] ?? '—')}
                        </td>
                      ))}
                      <td className="py-2.5 text-neutral-400 text-xs max-w-[150px] truncate">
                        {r.source ?? r.ip_address ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-3 flex-shrink-0">
            <p className="text-xs text-neutral-500">
              Página {page} de {totalPages} · {total} respuestas
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FormCard
// ---------------------------------------------------------------------------

interface FormCardProps {
  form: MarketingForm;
  onViewResponses: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
}

function FormCard({ form, onViewResponses, onDelete, onCopyLink }: FormCardProps) {
  return (
    <motion.div
      variants={staggerItem}
      className="rounded-xl border border-neutral-200 bg-white p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-neutral-900 truncate">{form.name}</h3>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
                form.status === 'ACTIVE'
                  ? 'bg-green-50 text-green-700 ring-green-200'
                  : 'bg-neutral-100 text-neutral-500 ring-neutral-200'
              }`}
            >
              {form.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          {form.description && (
            <p className="mt-1 text-sm text-neutral-500 line-clamp-2">{form.description}</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-4 flex items-center gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 7h12M7 1v12" opacity="0.4"/>
            <rect x="2" y="4" width="10" height="6" rx="1"/>
          </svg>
          {form.fields.length} campo{form.fields.length !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 3h10v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3z"/>
            <path d="M5 3V1.5M9 3V1.5"/>
          </svg>
          {form.response_count} respuesta{form.response_count !== 1 ? 's' : ''}
        </span>
        <span className="ml-auto">{formatDate(form.created_at)}</span>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-neutral-100 pt-4">
        <button
          type="button"
          onClick={onViewResponses}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M1 6.5C1 6.5 3.5 2 6.5 2S12 6.5 12 6.5 9.5 11 6.5 11 1 6.5 1 6.5z"/>
            <circle cx="6.5" cy="6.5" r="1.5"/>
          </svg>
          Ver respuestas
        </button>
        <button
          type="button"
          onClick={onCopyLink}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M5 7.5a3 3 0 0 0 4.5.3l1.5-1.5a3 3 0 0 0-4.2-4.3L5.7 3"/>
            <path d="M8 5.5a3 3 0 0 0-4.5-.3L2 6.7A3 3 0 0 0 6.2 11L7.3 10"/>
          </svg>
          Copiar link
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M2 3.5h9M5 3.5V2h3v1.5M4 3.5l.5 7h4l.5-7"/>
          </svg>
          Eliminar
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MarketingFormsPage() {
  const [forms, setForms] = useState<MarketingForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [responsesFor, setResponsesFor] = useState<MarketingForm | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchForms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/marketing/forms');
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json() as { items: MarketingForm[]; total: number };
      setForms(json.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar formularios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const handleCopyLink = (formId: string) => {
    const link = `${window.location.origin}/forms/${formId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(formId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleDelete = async (formId: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/marketing/forms/${formId}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(res.statusText);
      setDeleteConfirm(null);
      await fetchForms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col h-full"
    >
      <TopBar title="Formularios de Captación" />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Formularios de Captación</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Crea formularios para captar leads y recopilar información de clientes potenciales.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8 2v12M2 8h12" />
            </svg>
            Nuevo formulario
          </button>
        </div>

        {/* Toast: copied */}
        <AnimatePresence>
          {copiedId && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="fixed top-6 right-6 z-50 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl"
            >
              Link copiado al portapapeles
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && forms.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 py-16 px-8 text-center"
          >
            <div className="mb-4 h-16 w-16 rounded-2xl bg-white shadow-sm border border-neutral-200 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-neutral-400">
                <rect x="4" y="4" width="24" height="24" rx="3" />
                <path d="M4 11h24M11 28V11" />
                <path d="M16 17h6M16 21h4" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-neutral-700">Sin formularios</h3>
            <p className="mt-1 text-sm text-neutral-500 max-w-xs">
              Crea tu primer formulario para comenzar a captar información de clientes potenciales.
            </p>
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M7 1v12M1 7h12" />
              </svg>
              Crear formulario
            </button>
          </motion.div>
        )}

        {/* Forms grid */}
        {!loading && !error && forms.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {forms.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                onViewResponses={() => setResponsesFor(form)}
                onCopyLink={() => handleCopyLink(form.id)}
                onDelete={() => setDeleteConfirm(form.id)}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-neutral-900">Eliminar formulario</h3>
              <p className="mt-2 text-sm text-neutral-500">
                Esta acción eliminará el formulario y todas sus respuestas. ¿Deseas continuar?
              </p>
              <div className="mt-5 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => handleDelete(deleteConfirm)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New form modal */}
      <AnimatePresence>
        {showNewModal && (
          <NewFormModal
            onClose={() => setShowNewModal(false)}
            onCreated={() => { setShowNewModal(false); fetchForms(); }}
          />
        )}
      </AnimatePresence>

      {/* Responses panel */}
      <AnimatePresence>
        {responsesFor && (
          <ResponsesPanel
            form={responsesFor}
            onClose={() => setResponsesFor(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
