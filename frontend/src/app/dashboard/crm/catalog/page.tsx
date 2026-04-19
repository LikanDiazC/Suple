'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FurnitureCut {
  id?: string;
  label: string;
  material: string;
  width_mm: number | string;
  height_mm: number | string;
  thickness_mm?: number | string;
  quantity: number | string;
  notes?: string;
}

interface Furniture {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  cut_count: number;
  created_at: string;
  updated_at: string;
  cuts?: FurnitureCut[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MATERIALS = ['MDF', 'MDP', 'Plywood', 'OSB', 'Melamina', 'Terciado', 'Otro'];
const CATEGORIES = ['Dormitorio', 'Living', 'Cocina', 'Baño', 'Oficina', 'Exterior', 'Otro'];

const EMPTY_CUT: FurnitureCut = {
  label: '',
  material: 'MDF',
  width_mm: '',
  height_mm: '',
  thickness_mm: '',
  quantity: 1,
  notes: '',
};

const EMPTY_FORM = {
  name: '',
  description: '',
  category: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDim(v: number | string): string {
  const n = Number(v);
  return isNaN(n) ? String(v) : `${n} mm`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FurnitureCatalogPage() {
  const [furniture, setFurniture] = useState<Furniture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected furniture detail
  const [selected, setSelected] = useState<Furniture | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create / Edit modal
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [cuts, setCuts] = useState<FurnitureCut[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // ── Fetch list ──────────────────────────────────────────────────────────

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/erp/furniture', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setFurniture(Array.isArray(data) ? data : []);
    } catch {
      setFurniture([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Select detail ───────────────────────────────────────────────────────

  const openDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    setSelected(null);
    try {
      const res = await fetch(`/api/erp/furniture/${id}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setSelected(data);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // ── Open form ───────────────────────────────────────────────────────────

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setCuts([{ ...EMPTY_CUT }]);
    setFormError('');
    setShowForm(true);
  }

  async function openEdit(id: string) {
    setFormError('');
    const res = await fetch(`/api/erp/furniture/${id}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data: Furniture = await res.json();
    setEditingId(id);
    setForm({ name: data.name, description: data.description ?? '', category: data.category ?? '' });
    setCuts((data.cuts ?? []).map((c) => ({ ...c })));
    setShowForm(true);
  }

  // ── Cuts helpers ────────────────────────────────────────────────────────

  function addCut() {
    setCuts((prev) => [...prev, { ...EMPTY_CUT }]);
  }

  function removeCut(i: number) {
    setCuts((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateCut(i: number, field: keyof FurnitureCut, value: string | number) {
    setCuts((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  }

  // ── Save ────────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('El nombre es obligatorio'); return; }

    const invalidCut = cuts.find((c) => !c.label.trim() || !Number(c.width_mm) || !Number(c.height_mm));
    if (invalidCut) { setFormError('Todos los cortes deben tener etiqueta, ancho y alto'); return; }

    setSaving(true);
    setFormError('');
    try {
      const body = {
        ...form,
        cuts: cuts.map((c, i) => ({
          label: c.label.trim(),
          material: c.material,
          width_mm: Number(c.width_mm),
          height_mm: Number(c.height_mm),
          thickness_mm: c.thickness_mm ? Number(c.thickness_mm) : undefined,
          quantity: Number(c.quantity) || 1,
          notes: c.notes || undefined,
          sort_order: i,
        })),
      };

      const url = editingId ? `/api/erp/furniture/${editingId}` : '/api/erp/furniture';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setFormError('Error al guardar'); return; }
      const saved: Furniture = await res.json();

      setShowForm(false);
      await fetchList();
      openDetail(saved.id);
    } catch {
      setFormError('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este mueble y todos sus cortes?')) return;
    await fetch(`/api/erp/furniture/${id}`, { method: 'DELETE' });
    if (selected?.id === id) setSelected(null);
    await fetchList();
  }

  // ── Filter ──────────────────────────────────────────────────────────────

  const filtered = furniture.filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.category ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full bg-neutral-50">

      {/* ── Left panel: list ─────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 border-r border-neutral-200 bg-white flex flex-col">
        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-neutral-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-base font-semibold text-neutral-900">Catálogo de Muebles</h1>
              <p className="text-xs text-neutral-500 mt-0.5">Define muebles y sus cortes estándar</p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-700 transition-colors"
            >
              <span className="text-base leading-none">+</span>
              Nuevo
            </button>
          </div>
          <input
            type="text"
            placeholder="Buscar mueble..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
          {loading ? (
            <div className="px-4 py-8 text-center text-xs text-neutral-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm font-medium text-neutral-500">Sin muebles</p>
              <p className="text-xs text-neutral-400 mt-1">Crea el primer mueble con el botón de arriba</p>
            </div>
          ) : (
            filtered.map((f) => (
              <button
                key={f.id}
                onClick={() => openDetail(f.id)}
                className={`w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors ${selected?.id === f.id ? 'bg-blue-50 border-r-2 border-r-blue-600' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">{f.name}</p>
                    {f.category && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-500">
                        {f.category}
                      </span>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-[11px] text-neutral-400 mt-0.5">{f.cut_count} corte{f.cut_count !== 1 ? 's' : ''}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: detail ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {loadingDetail ? (
          <div className="flex items-center justify-center h-full text-sm text-neutral-400">Cargando...</div>
        ) : !selected ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-sm font-medium text-neutral-600">Selecciona un mueble</p>
            <p className="text-xs text-neutral-400 mt-1">Haz clic en un mueble para ver sus cortes</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-6">
            {/* Furniture header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">{selected.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {selected.category && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{selected.category}</span>
                  )}
                  <span className="text-xs text-neutral-400">{selected.cuts?.length ?? 0} corte{(selected.cuts?.length ?? 0) !== 1 ? 's' : ''}</span>
                </div>
                {selected.description && (
                  <p className="text-sm text-neutral-500 mt-2">{selected.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(selected.id)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>

            {/* Cuts table */}
            {!selected.cuts || selected.cuts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 py-10 text-center">
                <p className="text-sm text-neutral-400">Este mueble no tiene cortes definidos</p>
                <button
                  onClick={() => openEdit(selected.id)}
                  className="mt-3 text-xs text-blue-600 hover:underline"
                >
                  Agregar cortes
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-neutral-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      {['#', 'Etiqueta / Pieza', 'Material', 'Ancho', 'Alto', 'Espesor', 'Cant.', 'Notas'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {selected.cuts.map((cut, i) => (
                      <tr key={cut.id ?? i} className="hover:bg-neutral-50">
                        <td className="px-3 py-2.5 text-xs text-neutral-400">{i + 1}</td>
                        <td className="px-3 py-2.5 font-medium text-neutral-800">{cut.label}</td>
                        <td className="px-3 py-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-600">{cut.material}</span>
                        </td>
                        <td className="px-3 py-2.5 text-neutral-700 tabular-nums">{fmtDim(cut.width_mm)}</td>
                        <td className="px-3 py-2.5 text-neutral-700 tabular-nums">{fmtDim(cut.height_mm)}</td>
                        <td className="px-3 py-2.5 text-neutral-500 tabular-nums">{cut.thickness_mm ? fmtDim(cut.thickness_mm) : '—'}</td>
                        <td className="px-3 py-2.5 text-center text-neutral-700 tabular-nums">{cut.quantity}</td>
                        <td className="px-3 py-2.5 text-xs text-neutral-400 max-w-[120px] truncate">{cut.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary */}
            {selected.cuts && selected.cuts.length > 0 && (
              <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
                <span>Total piezas: <strong className="text-neutral-800">{selected.cuts.reduce((s, c) => s + Number(c.quantity), 0)}</strong></span>
                <span>Materiales: <strong className="text-neutral-800">{[...new Set(selected.cuts.map((c) => c.material))].join(', ')}</strong></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ───────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-6 px-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900">
                {editingId ? 'Editar mueble' : 'Nuevo mueble'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Nombre del mueble *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ej: Closet 2 puertas"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Categoría</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20 bg-white"
                  >
                    <option value="">Sin categoría</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Descripción</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Descripción opcional"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  />
                </div>
              </div>

              {/* Cuts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Cortes</h3>
                  <button
                    type="button"
                    onClick={addCut}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <span className="text-base leading-none">+</span> Agregar corte
                  </button>
                </div>

                {cuts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-neutral-200 py-6 text-center text-xs text-neutral-400">
                    No hay cortes — haz clic en "Agregar corte"
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Header row */}
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_0.7fr_1.5fr_auto] gap-1.5 px-1">
                      {['Etiqueta', 'Material', 'Ancho mm', 'Alto mm', 'Cant.', 'Notas', ''].map((h) => (
                        <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{h}</span>
                      ))}
                    </div>
                    {cuts.map((cut, i) => (
                      <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_0.7fr_1.5fr_auto] gap-1.5 items-center">
                        <input
                          type="text"
                          value={cut.label}
                          onChange={(e) => updateCut(i, 'label', e.target.value)}
                          placeholder="Panel lateral..."
                          className="px-2 py-1.5 rounded border border-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900/20"
                        />
                        <select
                          value={cut.material}
                          onChange={(e) => updateCut(i, 'material', e.target.value)}
                          className="px-2 py-1.5 rounded border border-neutral-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900/20"
                        >
                          {MATERIALS.map((m) => <option key={m}>{m}</option>)}
                        </select>
                        <input
                          type="number"
                          value={cut.width_mm}
                          onChange={(e) => updateCut(i, 'width_mm', e.target.value)}
                          placeholder="600"
                          min={1}
                          className="px-2 py-1.5 rounded border border-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900/20"
                        />
                        <input
                          type="number"
                          value={cut.height_mm}
                          onChange={(e) => updateCut(i, 'height_mm', e.target.value)}
                          placeholder="800"
                          min={1}
                          className="px-2 py-1.5 rounded border border-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900/20"
                        />
                        <input
                          type="number"
                          value={cut.quantity}
                          onChange={(e) => updateCut(i, 'quantity', e.target.value)}
                          min={1}
                          className="px-2 py-1.5 rounded border border-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900/20"
                        />
                        <input
                          type="text"
                          value={cut.notes ?? ''}
                          onChange={(e) => updateCut(i, 'notes', e.target.value)}
                          placeholder="Opcional"
                          className="px-2 py-1.5 rounded border border-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900/20"
                        />
                        <button
                          type="button"
                          onClick={() => removeCut(i)}
                          className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {formError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Guardando...' : (editingId ? 'Guardar cambios' : 'Crear mueble')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
