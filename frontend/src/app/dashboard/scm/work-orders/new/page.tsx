'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import TopBar from '../../../../../presentation/components/layout/TopBar';
import { pageTransition } from '../../../../../presentation/animations/variants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequirementRow {
  pieceId: string;
  label: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  allowRotation: boolean;
}

interface WizardState {
  step: 1 | 2 | 3;
  materialSku: string;
  thicknessMm: number;
  requirements: RequirementRow[];
}

interface AddRowDraft {
  label: string;
  widthMm: string;
  heightMm: string;
  quantity: string;
  allowRotation: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MATERIAL_OPTIONS = [
  { value: 'MDF-18', label: 'MDF-18', thickness: 18 },
  { value: 'MDF-15', label: 'MDF-15', thickness: 15 },
  { value: 'MDF-9',  label: 'MDF-9',  thickness: 9  },
  { value: 'MDP-18', label: 'MDP-18', thickness: 18 },
  { value: 'OSB-18', label: 'OSB-18', thickness: 18 },
];

const THICKNESS_MAP: Record<string, number> = Object.fromEntries(
  MATERIAL_OPTIONS.map((m) => [m.value, m.thickness])
);

// ---------------------------------------------------------------------------
// Slide animation variants
// ---------------------------------------------------------------------------

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 64 : -64,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -64 : 64,
    opacity: 0,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
  }),
};

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS = [
  { n: 1, label: 'Material' },
  { n: 2, label: 'Piezas' },
  { n: 3, label: 'Revisar y Enviar' },
];

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-0">
      {STEPS.map((s, idx) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <React.Fragment key={s.n}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  done
                    ? 'bg-primary-500 text-white'
                    : active
                    ? 'bg-primary-500 text-white ring-4 ring-primary-100'
                    : 'bg-neutral-100 text-neutral-400'
                }`}
              >
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 7l4 4 6-6" />
                  </svg>
                ) : (
                  s.n
                )}
              </div>
              <span className={`text-[11px] font-medium whitespace-nowrap ${active ? 'text-primary-600' : done ? 'text-neutral-500' : 'text-neutral-400'}`}>
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`mx-3 mb-5 h-px w-16 flex-shrink-0 transition-colors ${s.n < current ? 'bg-primary-400' : 'bg-neutral-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Material
// ---------------------------------------------------------------------------

function Step1({
  materialSku,
  thicknessMm,
  onChange,
  onNext,
}: {
  materialSku: string;
  thicknessMm: number;
  onChange: (sku: string, thickness: number) => void;
  onNext: () => void;
}) {
  const handleSkuChange = (sku: string) => {
    onChange(sku, THICKNESS_MAP[sku] ?? 18);
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-6">
      <h2 className="mb-1 text-base font-semibold text-neutral-800">Seleccionar material</h2>
      <p className="mb-6 text-xs text-neutral-400">Elige el SKU y verifica el espesor antes de continuar.</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-600">Material SKU</label>
          <select
            value={materialSku}
            onChange={(e) => handleSkuChange(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-800 outline-none transition-all focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
          >
            {MATERIAL_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-600">Espesor (mm)</label>
          <input
            type="number"
            value={thicknessMm}
            onChange={(e) => onChange(materialSku, Number(e.target.value))}
            min={1}
            max={50}
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-800 outline-none transition-all focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
          />
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-neutral-50 border border-neutral-100 px-4 py-3">
        <p className="text-xs text-neutral-500">
          Material seleccionado:{' '}
          <span className="font-semibold text-neutral-800">{materialSku}</span>
          {' · '}
          Espesor:{' '}
          <span className="font-semibold text-neutral-800">{thicknessMm} mm</span>
        </p>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600"
        >
          Siguiente
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 3l4 4-4 4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Pieces
// ---------------------------------------------------------------------------

const BLANK_DRAFT: AddRowDraft = {
  label: '',
  widthMm: '',
  heightMm: '',
  quantity: '1',
  allowRotation: true,
};

function Step2({
  requirements,
  onAdd,
  onRemove,
  onBack,
  onNext,
}: {
  requirements: RequirementRow[];
  onAdd: (row: RequirementRow) => void;
  onRemove: (pieceId: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<AddRowDraft>(BLANK_DRAFT);
  const [errors, setErrors] = useState<Partial<Record<keyof AddRowDraft, string>>>({});

  const validate = (): boolean => {
    const errs: Partial<Record<keyof AddRowDraft, string>> = {};
    const w = Number(draft.widthMm);
    const h = Number(draft.heightMm);
    const q = Number(draft.quantity);
    if (!draft.widthMm || isNaN(w) || w < 100 || w > 2440)
      errs.widthMm = 'Ancho debe ser entre 100 y 2440 mm';
    if (!draft.heightMm || isNaN(h) || h < 100 || h > 1220)
      errs.heightMm = 'Alto debe ser entre 100 y 1220 mm';
    if (!draft.quantity || isNaN(q) || q < 1)
      errs.quantity = 'Mínimo 1 unidad';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAdd = () => {
    if (!validate()) return;
    onAdd({
      pieceId: crypto.randomUUID(),
      label: draft.label.trim(),
      widthMm: Number(draft.widthMm),
      heightMm: Number(draft.heightMm),
      quantity: Number(draft.quantity),
      allowRotation: draft.allowRotation,
    });
    setDraft(BLANK_DRAFT);
    setErrors({});
    setShowForm(false);
  };

  const handleCancel = () => {
    setDraft(BLANK_DRAFT);
    setErrors({});
    setShowForm(false);
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-neutral-800">Definir piezas de corte</h2>
          <p className="text-xs text-neutral-400">Agrega todas las piezas que necesitas cortar.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-100"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 1v10M1 6h10" />
            </svg>
            Agregar Pieza
          </button>
        )}
      </div>

      {/* Inline add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50/40 p-4">
              <p className="mb-3 text-xs font-semibold text-primary-700">Nueva pieza</p>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {/* Label */}
                <div className="col-span-2">
                  <label className="mb-1 block text-[11px] font-medium text-neutral-500">Etiqueta (opcional)</label>
                  <input
                    type="text"
                    placeholder="ej: Lateral izq."
                    value={draft.label}
                    onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                    className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                  />
                </div>
                {/* Width */}
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-neutral-500">Ancho (mm)</label>
                  <input
                    type="number"
                    placeholder="100–2440"
                    min={100}
                    max={2440}
                    value={draft.widthMm}
                    onChange={(e) => setDraft((d) => ({ ...d, widthMm: e.target.value }))}
                    className={`w-full rounded-md border bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-1 ${errors.widthMm ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-neutral-200 focus:border-primary-400 focus:ring-primary-100'}`}
                  />
                  {errors.widthMm && <p className="mt-0.5 text-[10px] text-red-500">{errors.widthMm}</p>}
                </div>
                {/* Height */}
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-neutral-500">Alto (mm)</label>
                  <input
                    type="number"
                    placeholder="100–1220"
                    min={100}
                    max={1220}
                    value={draft.heightMm}
                    onChange={(e) => setDraft((d) => ({ ...d, heightMm: e.target.value }))}
                    className={`w-full rounded-md border bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-1 ${errors.heightMm ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-neutral-200 focus:border-primary-400 focus:ring-primary-100'}`}
                  />
                  {errors.heightMm && <p className="mt-0.5 text-[10px] text-red-500">{errors.heightMm}</p>}
                </div>
                {/* Quantity */}
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-neutral-500">Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    value={draft.quantity}
                    onChange={(e) => setDraft((d) => ({ ...d, quantity: e.target.value }))}
                    className={`w-full rounded-md border bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-1 ${errors.quantity ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-neutral-200 focus:border-primary-400 focus:ring-primary-100'}`}
                  />
                  {errors.quantity && <p className="mt-0.5 text-[10px] text-red-500">{errors.quantity}</p>}
                </div>
                {/* Rotation */}
                <div className="flex flex-col justify-center gap-1">
                  <label className="block text-[11px] font-medium text-neutral-500">Rotación</label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.allowRotation}
                      onChange={(e) => setDraft((d) => ({ ...d, allowRotation: e.target.checked }))}
                      className="h-3.5 w-3.5 rounded accent-primary-500"
                    />
                    <span className="text-xs text-neutral-600">Permitir</span>
                  </label>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleAdd}
                  className="rounded-md bg-primary-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-600"
                >
                  Agregar
                </button>
                <button
                  onClick={handleCancel}
                  className="rounded-md border border-neutral-200 px-3.5 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      {requirements.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Etiqueta</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Ancho (mm)</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Alto (mm)</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Cantidad</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Rotación</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {requirements.map((row, idx) => (
                  <motion.tr
                    key={row.pieceId}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`border-b border-neutral-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}
                  >
                    <td className="px-4 py-2.5 text-sm text-neutral-700">
                      {row.label || <span className="text-neutral-300 italic">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm text-neutral-700">{row.widthMm}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm text-neutral-700">{row.heightMm}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm font-semibold text-neutral-800">{row.quantity}</td>
                    <td className="px-4 py-2.5 text-center">
                      {row.allowRotation ? (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold bg-green-50 text-green-700">Sí</span>
                      ) : (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold bg-neutral-100 text-neutral-500">No</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => onRemove(row.pieceId)}
                        className="rounded p-1 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        title="Eliminar pieza"
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M2 3h9M5 3V2h3v1M4 3l.5 7h4L9 3" />
                        </svg>
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 py-12 text-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2 text-neutral-300">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 12h6M12 9v6" />
          </svg>
          <p className="text-xs text-neutral-400">Aún no has agregado piezas</p>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-50"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3L5 7l4 4" />
          </svg>
          Anterior
        </button>
        <button
          onClick={onNext}
          disabled={requirements.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 3l4 4-4 4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Review & Submit
// ---------------------------------------------------------------------------

function Step3({
  materialSku,
  thicknessMm,
  requirements,
  onBack,
  onSubmit,
  submitting,
  error,
}: {
  materialSku: string;
  thicknessMm: number;
  requirements: RequirementRow[];
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const totalPieces = requirements.reduce((acc, r) => acc + r.quantity, 0);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-6">
      <h2 className="mb-1 text-base font-semibold text-neutral-800">Revisar y enviar orden</h2>
      <p className="mb-6 text-xs text-neutral-400">Confirma los datos antes de enviar al motor de optimización.</p>

      {/* Summary card */}
      <div className="mb-5 rounded-lg border border-neutral-100 bg-neutral-50 px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">Material</p>
          <p className="mt-1 text-sm font-semibold text-neutral-800">{materialSku}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">Espesor</p>
          <p className="mt-1 text-sm font-semibold text-neutral-800">{thicknessMm} mm</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">Total piezas</p>
          <p className="mt-1 text-sm font-semibold text-neutral-800">{totalPieces} unidades ({requirements.length} tipo{requirements.length !== 1 ? 's' : ''})</p>
        </div>
      </div>

      {/* Requirements table */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Etiqueta</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Ancho</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Alto</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Cant.</th>
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Rotación</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((row, idx) => (
              <tr key={row.pieceId} className={`border-b border-neutral-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}>
                <td className="px-4 py-2.5 text-sm text-neutral-700">{row.label || <span className="italic text-neutral-300">—</span>}</td>
                <td className="px-4 py-2.5 text-right font-mono text-sm text-neutral-700">{row.widthMm} mm</td>
                <td className="px-4 py-2.5 text-right font-mono text-sm text-neutral-700">{row.heightMm} mm</td>
                <td className="px-4 py-2.5 text-right font-mono text-sm font-semibold text-neutral-800">{row.quantity}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${row.allowRotation ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                    {row.allowRotation ? 'Sí' : 'No'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
          >
            <div className="flex items-start gap-2">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mt-0.5 flex-shrink-0 text-red-500">
                <circle cx="7.5" cy="7.5" r="6" />
                <path d="M7.5 5v3M7.5 10v0" />
              </svg>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-40"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3L5 7l4 4" />
          </svg>
          Anterior
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 1v2M7 11v2M1 7h2M11 7h2" strokeLinecap="round" />
                <path d="M3 3l1.4 1.4M9.6 9.6L11 11M3 11l1.4-1.4M9.6 4.4L11 3" strokeLinecap="round" opacity=".5" />
              </svg>
              Procesando…
            </>
          ) : (
            <>
              Crear Orden de Corte ✓
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Success state
// ---------------------------------------------------------------------------

function SuccessState({ orderId, onNavigate }: { orderId: string; onNavigate: () => void }) {
  // Extract trailing digit-group from the order ID (e.g. "wo_pending_042" → "0042").
  // Falls back to the last 8 chars if the API returns an opaque ID.
  const match = orderId.match(/(\d+)$/);
  const displayId = match
    ? String(parseInt(match[1], 10)).padStart(4, '0')
    : orderId.slice(-8).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="rounded-xl border border-green-200 bg-green-50 p-10 text-center shadow-sm"
    >
      <div className="mb-4 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
            <path d="M4 13l6 6 12-12" />
          </svg>
        </div>
      </div>
      <h3 className="text-base font-bold text-green-800">Orden creada exitosamente</h3>
      <p className="mt-1 text-xs text-green-600">
        ID:{' '}
        <span className="font-mono font-semibold">#{displayId}</span>
      </p>
      <p className="mt-2 text-xs text-green-600">El motor de optimización procesará la orden en breve.</p>
      <button
        onClick={onNavigate}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
      >
        Ver Orden
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6.5h7M7 4l2.5 2.5L7 9" />
        </svg>
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main wizard page
// ---------------------------------------------------------------------------

export default function NewWorkOrderPage() {
  const router = useRouter();

  const [wizard, setWizard] = useState<WizardState>({
    step: 1,
    materialSku: 'MDF-18',
    thicknessMm: 18,
    requirements: [],
  });

  // Direction for slide animation: +1 = forward, -1 = backward
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const goTo = (nextStep: 1 | 2 | 3, dir: number) => {
    setDirection(dir);
    setWizard((w) => ({ ...w, step: nextStep }));
  };

  const handleMaterialChange = (sku: string, thickness: number) => {
    setWizard((w) => ({ ...w, materialSku: sku, thicknessMm: thickness }));
  };

  const handleAddPiece = (row: RequirementRow) => {
    setWizard((w) => ({ ...w, requirements: [...w.requirements, row] }));
  };

  const handleRemovePiece = (pieceId: string) => {
    setWizard((w) => ({ ...w, requirements: w.requirements.filter((r) => r.pieceId !== pieceId) }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body = {
        materialSku: wizard.materialSku,
        thicknessMm: wizard.thicknessMm,
        requirements: wizard.requirements,
      };
      const res = await fetch('/api/scm/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? `Error ${res.status}`);
      }
      const created = await res.json();
      setCreatedId(created.id ?? created.workOrderId ?? 'unknown');
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Error al crear la orden. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <TopBar
        title="Nueva Orden de Corte"
        subtitle="Definir requerimientos y enviar al motor de optimización"
      />

      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        className="p-4 sm:p-6 lg:p-8"
      >
        {/* Header back button */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard/scm/work-orders')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 hover:text-neutral-800"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3L5 7l4 4" />
            </svg>
            Órdenes de Trabajo
          </button>
        </div>

        {/* Content area */}
        <div className="mx-auto max-w-3xl">
          {createdId ? (
            <SuccessState
              orderId={createdId}
              onNavigate={() => router.push(`/dashboard/scm/work-orders/${createdId}`)}
            />
          ) : (
            <>
              <StepIndicator current={wizard.step} />

              {/* Animated step content */}
              <div className="relative overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>
                  {wizard.step === 1 && (
                    <motion.div
                      key="step1"
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                    >
                      <Step1
                        materialSku={wizard.materialSku}
                        thicknessMm={wizard.thicknessMm}
                        onChange={handleMaterialChange}
                        onNext={() => goTo(2, 1)}
                      />
                    </motion.div>
                  )}

                  {wizard.step === 2 && (
                    <motion.div
                      key="step2"
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                    >
                      <Step2
                        requirements={wizard.requirements}
                        onAdd={handleAddPiece}
                        onRemove={handleRemovePiece}
                        onBack={() => goTo(1, -1)}
                        onNext={() => goTo(3, 1)}
                      />
                    </motion.div>
                  )}

                  {wizard.step === 3 && (
                    <motion.div
                      key="step3"
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                    >
                      <Step3
                        materialSku={wizard.materialSku}
                        thicknessMm={wizard.thicknessMm}
                        requirements={wizard.requirements}
                        onBack={() => goTo(2, -1)}
                        onSubmit={handleSubmit}
                        submitting={submitting}
                        error={submitError}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}
