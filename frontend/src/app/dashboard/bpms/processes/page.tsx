'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import TopBar from '../../../../presentation/components/layout/TopBar';
import {
  pageTransition,
  staggerContainer,
  staggerItem,
} from '../../../../presentation/animations/variants';
import type { ProcessDefinition, ProcessDefinitionStatus } from '../../../../types/bpms';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = ['Todos', 'ventas', 'compras', 'produccion', 'general'] as const;
type Category = typeof CATEGORIES[number];

/**
 * Display label for each category. Uses the accented Spanish form for
 * "producción" while keeping the wire-level key `produccion` intact.
 */
const CATEGORY_LABEL: Record<Category, string> = {
  Todos:      'Todos',
  ventas:     'Ventas',
  compras:    'Compras',
  produccion: 'Producción',
  general:    'General',
};

const STATUS_STYLES: Record<ProcessDefinitionStatus, string> = {
  ACTIVE:     'bg-green-50 text-green-700 ring-1 ring-green-200',
  DRAFT:      'bg-neutral-100 text-neutral-500 ring-1 ring-neutral-200',
  DEPRECATED: 'bg-red-50 text-red-600 ring-1 ring-red-200',
};

const STATUS_LABELS: Record<ProcessDefinitionStatus, string> = {
  ACTIVE:     'Activo',
  DRAFT:      'Borrador',
  DEPRECATED: 'Obsoleto',
};

const CATEGORY_COLORS: Record<string, string> = {
  ventas:     'bg-blue-50 text-blue-700',
  compras:    'bg-violet-50 text-violet-700',
  produccion: 'bg-amber-50 text-amber-700',
  general:    'bg-neutral-100 text-neutral-600',
};

// Canonical emoji icon — definitions may store legacy string names
const ICON_EMOJI_MAP: Record<string, string> = {
  'shopping-cart': '🛒',
  package:         '📦',
  tool:            '🔧',
  clipboard:       '📋',
  document:        '📄',
};

function resolveIcon(icon?: string): string {
  if (!icon) return '⚙️';
  if (ICON_EMOJI_MAP[icon]) return ICON_EMOJI_MAP[icon];
  // If already an emoji (unicode > U+00FF) return as-is
  return icon.codePointAt(0)! > 0x00ff ? icon : '⚙️';
}

// ---------------------------------------------------------------------------
// Start Process Modal
// ---------------------------------------------------------------------------

interface StartProcessModalProps {
  definition: ProcessDefinition;
  onClose: () => void;
  onSuccess: () => void;
}

function StartProcessModal({ definition, onClose, onSuccess }: StartProcessModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [variables, setVariables] = useState('{}');
  const [variablesError, setVariablesError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateVariables(val: string): boolean {
    try {
      JSON.parse(val);
      setVariablesError('');
      return true;
    } catch {
      setVariablesError('JSON inválido');
      return false;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateVariables(variables)) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/bpms/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          definitionId: definition.id,
          title: title.trim() || `${definition.name} — ${new Date().toLocaleDateString('es-CL')}`,
          variables: JSON.parse(variables),
          startedBy: 'user',
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      onSuccess();
      router.push('/dashboard/bpms/monitor');
    } catch (err) {
      console.error('[StartProcessModal] submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Iniciar proceso</p>
            <h2 className="mt-0.5 text-lg font-bold text-neutral-900">{definition.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 2l12 12M14 2L2 14" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Título del proceso
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Ej: ${definition.name} #001`}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 outline-none transition-all focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
            />
          </div>

          {/* Variables */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Variables iniciales{' '}
              <span className="font-normal text-neutral-400">(JSON, opcional)</span>
            </label>
            <textarea
              value={variables}
              onChange={(e) => {
                setVariables(e.target.value);
                validateVariables(e.target.value);
              }}
              rows={4}
              className={`w-full rounded-lg border bg-neutral-50 px-3.5 py-2.5 font-mono text-sm text-neutral-800 outline-none transition-all focus:bg-white focus:ring-2 ${
                variablesError
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                  : 'border-neutral-200 focus:border-primary-400 focus:ring-primary-100'
              }`}
            />
            {variablesError && (
              <p className="mt-1 text-xs text-red-500">{variablesError}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!variablesError}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Iniciando...' : 'Iniciar Proceso'}
            </button>
          </div>
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
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-5 space-y-3 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-lg bg-neutral-100" />
        <div className="h-5 w-16 rounded-full bg-neutral-100" />
      </div>
      <div className="h-5 w-3/4 rounded bg-neutral-100" />
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded bg-neutral-100" />
        <div className="h-3 w-2/3 rounded bg-neutral-100" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <div className="h-4 w-16 rounded-full bg-neutral-100" />
        <div className="h-4 w-8 rounded bg-neutral-100" />
      </div>
      <div className="flex gap-2 pt-1">
        <div className="h-8 w-16 rounded-lg bg-neutral-100" />
        <div className="h-8 w-16 rounded-lg bg-neutral-100" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Process card
// ---------------------------------------------------------------------------

interface ProcessCardProps {
  definition: ProcessDefinition;
  onEdit: () => void;
  onStart: () => void;
  onPublish: () => void;
}

function ProcessCard({ definition, onEdit, onStart, onPublish }: ProcessCardProps) {
  const nodeCount = definition.nodes?.length ?? 0;

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
      className="rounded-xl border border-neutral-200 bg-white shadow-sm p-5 flex flex-col gap-3"
    >
      {/* Top row: icon + status */}
      <div className="flex items-start justify-between">
        <span className="text-3xl leading-none" aria-label="icon">
          {resolveIcon(definition.icon)}
        </span>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[definition.status]}`}>
          {STATUS_LABELS[definition.status]}
        </span>
      </div>

      {/* Name */}
      <p className="text-base font-bold text-neutral-900 leading-snug">{definition.name}</p>

      {/* Description */}
      <p className="text-sm text-neutral-500 line-clamp-2 leading-relaxed">
        {definition.description || 'Sin descripción.'}
      </p>

      {/* Category + version */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${CATEGORY_COLORS[definition.category] ?? 'bg-neutral-100 text-neutral-600'}`}>
          {CATEGORY_LABEL[definition.category as Category] ?? definition.category}
        </span>
        <span className="font-mono text-[11px] text-neutral-400">v{definition.version}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-neutral-100 pt-3 mt-auto">
        <span className="text-xs text-neutral-400">{nodeCount} nodo{nodeCount !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            Editar
          </button>
          {definition.status === 'ACTIVE' && (
            <button
              onClick={onStart}
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700 transition-colors"
            >
              Iniciar
            </button>
          )}
          {definition.status === 'DRAFT' && (
            <button
              onClick={onPublish}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
            >
              Publicar
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProcessesPage() {
  const router = useRouter();

  const [definitions, setDefinitions] = useState<ProcessDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('Todos');
  const [startModalDefinition, setStartModalDefinition] = useState<ProcessDefinition | null>(null);

  const fetchDefinitions = useCallback(async () => {
    try {
      const res = await fetch('/api/bpms/definitions');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setDefinitions(Array.isArray(data) ? data : (data.data ?? []));
    } catch (err) {
      console.error('[ProcessesPage] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDefinitions(); }, [fetchDefinitions]);

  async function handlePublish(id: string) {
    try {
      await fetch(`/api/bpms/definitions/${id}/publish`, { method: 'POST' });
      await fetchDefinitions();
    } catch (err) {
      console.error('[ProcessesPage] publish error:', err);
    }
  }

  // Filtered list
  const filtered = definitions.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'Todos' || d.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <TopBar title="Procesos" subtitle="Biblioteca de flujos de trabajo" />

      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        className="p-4 sm:p-6 lg:p-8"
      >
        {/* Header row */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {/* Back */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 1L3 7l6 6" />
            </svg>
            Volver
          </button>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar proceso..."
              className="h-9 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-4 text-sm text-neutral-700 placeholder-neutral-400 outline-none transition-all focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="6" cy="6" r="4.5" /><path d="M10 10l3 3" />
            </svg>
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  category === cat
                    ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {CATEGORY_LABEL[cat]}
              </button>
            ))}
          </div>

          {/* New process */}
          <button
            onClick={() => router.push('/dashboard/bpms/designer')}
            className="ml-auto flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M7 1v12M1 7h12" />
            </svg>
            Nuevo Proceso
          </button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 py-20 text-center">
            <span className="text-4xl">📭</span>
            <p className="mt-3 text-sm font-medium text-neutral-500">No se encontraron procesos</p>
            <p className="mt-1 text-xs text-neutral-400">Intenta ajustar los filtros o crea un nuevo proceso.</p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {filtered.map((def) => (
              <ProcessCard
                key={def.id}
                definition={def}
                onEdit={() => router.push(`/dashboard/bpms/designer?id=${def.id}`)}
                onStart={() => setStartModalDefinition(def)}
                onPublish={() => handlePublish(def.id)}
              />
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Start Process Modal */}
      <AnimatePresence>
        {startModalDefinition && (
          <StartProcessModal
            definition={startModalDefinition}
            onClose={() => setStartModalDefinition(null)}
            onSuccess={() => setStartModalDefinition(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
