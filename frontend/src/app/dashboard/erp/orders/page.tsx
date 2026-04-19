'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '../../../../presentation/components/layout/TopBar';
import { pageTransition, staggerContainer, staggerItem } from '../../../../presentation/animations/variants';

// ─── Types ───────────────────────────────────────────────────────────────────

type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PRODUCTION' | 'COMPLETED' | 'CANCELLED';

interface OrderItem {
  id: string;
  material: string;
  width_mm: number;
  height_mm: number;
  quantity: number;
  unit_cost: number;
  notes: string | null;
  stock_available: boolean | null;
}

interface Order {
  id: string;
  order_number: string;
  description: string | null;
  status: OrderStatus;
  total_cost: number;
  notes: string | null;
  crm_contact_id: string | null;
  client_name: string | null;
  client_email: string | null;
  item_count: number;
  created_at: string;
  items?: OrderItem[];
}

interface CrmContact {
  id: string;
  properties: {
    name?: { value?: string } | string;
    first_name?: { value?: string } | string;
    last_name?: { value?: string } | string;
    email?: { value?: string } | string;
    [key: string]: unknown;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT:         'Borrador',
  CONFIRMED:     'Confirmado',
  IN_PRODUCTION: 'En producción',
  COMPLETED:     'Completado',
  CANCELLED:     'Cancelado',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  DRAFT:         'bg-neutral-100 text-neutral-600',
  CONFIRMED:     'bg-blue-50 text-blue-700',
  IN_PRODUCTION: 'bg-amber-50 text-amber-700',
  COMPLETED:     'bg-green-50 text-green-700',
  CANCELLED:     'bg-red-50 text-red-700',
};

const MATERIALS = ['MDF', 'MDP', 'Plywood', 'OSB', 'Melamina', 'Otro'];

const FILTER_OPTIONS: Array<{ value: 'all' | OrderStatus; label: string }> = [
  { value: 'all',         label: 'Todos' },
  { value: 'DRAFT',         label: 'Borrador' },
  { value: 'CONFIRMED',     label: 'Confirmado' },
  { value: 'IN_PRODUCTION', label: 'En producción' },
  { value: 'COMPLETED',     label: 'Completado' },
  { value: 'CANCELLED',     label: 'Cancelado' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCost(n: number | string): string {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  return isNaN(v) ? '0' : v.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function pval(v: unknown): string {
  if (!v) return '';
  if (typeof v === 'object' && v !== null && 'value' in v) return String((v as { value?: unknown }).value ?? '');
  return String(v);
}

function contactLabel(c: CrmContact): string {
  const p = c.properties;
  const name = pval(p.name) || [pval(p.first_name), pval(p.last_name)].filter(Boolean).join(' ') || '';
  const email = pval(p.email);
  return name ? `${name}${email ? ` — ${email}` : ''}` : (email || c.id);
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OrdersPage() {
  // List state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');

  // Modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [newForm, setNewForm] = useState({ furniture_id: '', description: '', crm_contact_id: '', notes: '' });
  const [creating, setCreating] = useState(false);

  // Detail panel state
  const [selected, setSelected] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Add item form state
  const [itemForm, setItemForm] = useState({
    material: 'MDF',
    width_mm: '',
    height_mm: '',
    quantity: '1',
    unit_cost: '',
    notes: '',
  });
  const [addingItem, setAddingItem] = useState(false);

  // Stock check state
  const [stockChecking, setStockChecking] = useState(false);
  const [stockSummary, setStockSummary] = useState<{ total: number; available: number; insufficient: number } | null>(null);

  // Confirm status change
  const [confirmingStatus, setConfirmingStatus] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [showStockWarning, setShowStockWarning] = useState(false);

  // Furniture catalog state
  const [furnitureCatalog, setFurnitureCatalog] = useState<{ id: string; name: string; cut_count: number }[]>([]);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState('');
  const [applyingFurniture, setApplyingFurniture] = useState(false);

  // ── Fetch orders ──────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/erp/orders', { cache: 'no-store' });
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Fetch furniture catalog ───────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/erp/furniture', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setFurnitureCatalog(Array.isArray(d) ? d : []))
      .catch(() => setFurnitureCatalog([]));
  }, []);

  // ── Apply furniture cuts to order ─────────────────────────────────────────

  const handleApplyFurniture = useCallback(async () => {
    if (!selected || !selectedFurnitureId) return;
    setApplyingFurniture(true);
    try {
      const res = await fetch(`/api/erp/furniture/apply-to-order/${selected.id}/${selectedFurnitureId}`, {
        method: 'POST',
      });
      if (!res.ok) return;
      setSelectedFurnitureId('');
      // Reload detail to show new items
      const detailRes = await fetch(`/api/erp/orders/${selected.id}`, { cache: 'no-store' });
      if (detailRes.ok) setSelected(await detailRes.json());
      await fetchOrders();
    } finally {
      setApplyingFurniture(false);
    }
  }, [selected, selectedFurnitureId, fetchOrders]);

  // ── Fetch contacts for new order modal ───────────────────────────────────

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/contacts?limit=200', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      // CRM list endpoint returns { results: [...], total, ... }
      setContacts(Array.isArray(data) ? data : (data.results ?? data.items ?? []));
    } catch {
      setContacts([]);
    }
  }, []);

  // ── Create order ─────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newForm.furniture_id) return; // furniture required
    setCreating(true);
    try {
      const res = await fetch('/api/erp/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newForm.description || undefined,
          crm_contact_id: newForm.crm_contact_id || undefined,
          notes: newForm.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error('create failed');
      const order = await res.json();

      // Auto-import cuts from selected furniture
      await fetch(`/api/erp/furniture/apply-to-order/${order.id}/${newForm.furniture_id}`, {
        method: 'POST',
      });

      setShowNewModal(false);
      setNewForm({ furniture_id: '', description: '', crm_contact_id: '', notes: '' });
      await fetchOrders();
      openDetail(order.id);
    } catch {
      // silent — keep modal open
    } finally {
      setCreating(false);
    }
  }

  // ── Open detail panel ────────────────────────────────────────────────────

  async function openDetail(id: string) {
    setDetailLoading(true);
    setStockSummary(null);
    try {
      const res = await fetch(`/api/erp/orders/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setSelected(data);
    } catch {
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  }

  // ── Add item ─────────────────────────────────────────────────────────────

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setAddingItem(true);
    try {
      const res = await fetch(`/api/erp/orders/${selected.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material: itemForm.material,
          width_mm: Number(itemForm.width_mm),
          height_mm: Number(itemForm.height_mm),
          quantity: Number(itemForm.quantity) || 1,
          unit_cost: itemForm.unit_cost ? Number(itemForm.unit_cost) : undefined,
          notes: itemForm.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error('add item failed');
      setItemForm({ material: 'MDF', width_mm: '', height_mm: '', quantity: '1', unit_cost: '', notes: '' });
      setStockSummary(null);
      await openDetail(selected.id);
      await fetchOrders();
    } catch {
      // silent
    } finally {
      setAddingItem(false);
    }
  }

  // ── Delete item ───────────────────────────────────────────────────────────

  async function handleDeleteItem(itemId: string) {
    if (!selected) return;
    try {
      await fetch(`/api/erp/orders/${selected.id}/items/${itemId}`, { method: 'DELETE' });
      setStockSummary(null);
      await openDetail(selected.id);
      await fetchOrders();
    } catch {
      // silent
    }
  }

  // ── Check stock ───────────────────────────────────────────────────────────

  async function handleCheckStock() {
    if (!selected) return;
    setStockChecking(true);
    try {
      const res = await fetch(`/api/erp/orders/${selected.id}/check-stock`, { method: 'POST' });
      if (!res.ok) throw new Error('check failed');
      const data = await res.json();
      setStockSummary(data.summary);
      // Refresh items to get updated stock_available flags
      await openDetail(selected.id);
    } catch {
      // silent
    } finally {
      setStockChecking(false);
    }
  }

  // ── Change status ─────────────────────────────────────────────────────────

  async function applyStatusChange(status: OrderStatus) {
    if (!selected) return;
    setConfirmingStatus(true);
    try {
      const res = await fetch(`/api/erp/orders/${selected.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('update failed');
      const updated = await res.json();
      setSelected((prev) => prev ? { ...prev, ...updated } : prev);
      setOrders((prev) => prev.map((o) => o.id === updated.id ? { ...o, status: updated.status } : o));
    } catch {
      // silent
    } finally {
      setConfirmingStatus(false);
      setPendingStatus(null);
      setShowStockWarning(false);
    }
  }

  function handleStatusChange(status: OrderStatus) {
    if (!selected) return;
    // If confirming and some items have insufficient stock, warn
    if (status === 'CONFIRMED' && stockSummary && stockSummary.insufficient > 0) {
      setPendingStatus(status);
      setShowStockWarning(true);
      return;
    }
    applyStatusChange(status);
  }

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <TopBar title="Pedidos" subtitle="Órdenes de fabricación con lista de materiales (BOM)" />

      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        className="flex h-[calc(100vh-64px)] overflow-hidden"
      >
        {/* ── Left: list panel ── */}
        <div className={`flex flex-col ${selected ? 'hidden lg:flex lg:w-[55%]' : 'w-full'} overflow-y-auto p-4 sm:p-6`}>

          {/* Header */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-neutral-900">Pedidos</h2>
            <button
              onClick={() => { setShowNewModal(true); fetchContacts(); }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 1v12M1 7h12"/></svg>
              Nuevo pedido
            </button>
          </div>

          {/* Filter pills */}
          <div className="mb-4 flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  filter === f.value
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-white text-neutral-500 border border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-x-auto"
          >
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50">
                  {['Nº Pedido', 'Cliente', 'Descripción', 'Items', 'Total', 'Estado', 'Fecha', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-neutral-400">
                      <svg className="animate-spin inline-block mr-2" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6" strokeDasharray="20" strokeDashoffset="10"/></svg>
                      Cargando pedidos...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-neutral-400">
                      No hay pedidos{filter !== 'all' ? ` con estado "${STATUS_LABEL[filter as OrderStatus]}"` : ''}. Crea el primero.
                    </td>
                  </tr>
                ) : filtered.map((order) => (
                  <motion.tr
                    key={order.id}
                    variants={staggerItem}
                    onClick={() => openDetail(order.id)}
                    className={`border-b border-neutral-50 hover:bg-neutral-50 transition-colors cursor-pointer ${selected?.id === order.id ? 'bg-primary-50' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-primary-600">{order.order_number}</td>
                    <td className="px-4 py-3 text-sm text-neutral-700 max-w-[140px] truncate">{order.client_name ?? <span className="text-neutral-400 italic">Sin cliente</span>}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600 max-w-[180px] truncate">{order.description ?? <span className="text-neutral-400">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-neutral-500 text-center">{order.item_count}</td>
                    <td className="px-4 py-3 text-sm font-mono text-neutral-800">${fmtCost(order.total_cost)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[order.status]}`}>
                        {STATUS_LABEL[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-400">{fmtDate(order.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar este pedido?')) { fetch(`/api/erp/orders/${order.id}`, { method: 'DELETE' }).then(() => { fetchOrders(); if (selected?.id === order.id) setSelected(null); }); } }}
                        className="rounded p-1 text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4h10M5 4V2h4v2M6 7v4M8 7v4M3 4l1 8h6l1-8"/></svg>
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>

        {/* ── Right: detail panel ── */}
        <AnimatePresence>
          {(selected || detailLoading) && (
            <motion.div
              key="detail-panel"
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="w-full lg:w-[45%] flex-shrink-0 border-l border-neutral-200 bg-white overflow-y-auto"
            >
              {detailLoading ? (
                <div className="flex items-center justify-center h-48 text-neutral-400">
                  <svg className="animate-spin mr-2" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="8" strokeDasharray="25" strokeDashoffset="12"/></svg>
                  Cargando...
                </div>
              ) : selected ? (
                <div className="p-5">
                  {/* Panel header */}
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold font-mono text-neutral-900">{selected.order_number}</span>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[selected.status]}`}>
                          {STATUS_LABEL[selected.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-400">{fmtDate(selected.created_at)}</p>
                    </div>
                    <button onClick={() => setSelected(null)} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 transition-colors flex-shrink-0">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
                    </button>
                  </div>

                  {/* Status edit */}
                  <div className="mb-4">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Cambiar estado</label>
                    <select
                      value={selected.status}
                      onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
                      disabled={confirmingStatus}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </div>

                  {/* Client info */}
                  {selected.client_name && (
                    <div className="mb-4 rounded-lg bg-neutral-50 p-3 border border-neutral-100">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">Cliente</p>
                      <p className="text-sm font-medium text-neutral-800">{selected.client_name}</p>
                      {selected.client_email && <p className="text-xs text-neutral-500">{selected.client_email}</p>}
                    </div>
                  )}

                  {/* Description / Notes */}
                  {selected.description && (
                    <div className="mb-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">Descripción</p>
                      <p className="text-sm text-neutral-700">{selected.description}</p>
                    </div>
                  )}
                  {selected.notes && (
                    <div className="mb-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">Notas</p>
                      <p className="text-sm text-neutral-600 whitespace-pre-line">{selected.notes}</p>
                    </div>
                  )}

                  {/* Divider */}
                  <hr className="border-neutral-100 my-4" />

                  {/* BOM Items section */}
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-neutral-800">Componentes (BOM)</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400">Total: <span className="font-mono font-semibold text-neutral-700">${fmtCost(selected.total_cost)}</span></span>
                    </div>
                  </div>

                  {/* Items table */}
                  {(!selected.items || selected.items.length === 0) ? (
                    <p className="text-sm text-neutral-400 italic mb-4">Sin componentes. Agrega el primero abajo.</p>
                  ) : (
                    <div className="mb-4 rounded-lg border border-neutral-200 overflow-x-auto">
                      <table className="w-full min-w-[440px] text-sm">
                        <thead>
                          <tr className="bg-neutral-50 border-b border-neutral-100">
                            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Material</th>
                            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Ancho×Alto</th>
                            <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Cant</th>
                            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Costo unit</th>
                            <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Stock</th>
                            <th className="px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {selected.items.map((item) => (
                            <tr key={item.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                              <td className="px-3 py-2 font-medium text-neutral-800">{item.material}</td>
                              <td className="px-3 py-2 text-neutral-600 font-mono text-xs">{item.width_mm}×{item.height_mm}mm</td>
                              <td className="px-3 py-2 text-center text-neutral-700">{item.quantity}</td>
                              <td className="px-3 py-2 text-right font-mono text-neutral-700">${fmtCost(item.unit_cost)}</td>
                              <td className="px-3 py-2 text-center">
                                {item.stock_available === null ? (
                                  <span className="text-neutral-300 text-xs">—</span>
                                ) : item.stock_available ? (
                                  <span className="text-green-600 text-xs font-semibold">✓</span>
                                ) : (
                                  <span className="text-red-500 text-xs font-semibold">✗</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="rounded p-0.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                  title="Eliminar componente"
                                >
                                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4h10M5 4V2h4v2M6 7v4M8 7v4M3 4l1 8h6l1-8"/></svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Verify stock button */}
                  <div className="mb-4 flex flex-col gap-2">
                    <button
                      onClick={handleCheckStock}
                      disabled={stockChecking || !selected.items?.length}
                      className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {stockChecking ? (
                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6" strokeDasharray="20" strokeDashoffset="10"/></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></svg>
                      )}
                      Verificar stock
                    </button>

                    {stockSummary && (
                      <div className={`rounded-lg px-3 py-2 text-sm font-medium ${stockSummary.insufficient === 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {stockSummary.available} de {stockSummary.total} materiales disponibles en inventario
                        {stockSummary.insufficient > 0 && ` — ${stockSummary.insufficient} insuficiente(s)`}
                      </div>
                    )}
                  </div>

                  {/* Furniture catalog selector */}
                  {furnitureCatalog.length > 0 && (
                    <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-600">Importar cortes desde catálogo</h4>
                      <div className="flex gap-2">
                        <select
                          value={selectedFurnitureId}
                          onChange={(e) => setSelectedFurnitureId(e.target.value)}
                          className="flex-1 rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                          <option value="">Seleccionar mueble...</option>
                          {furnitureCatalog.map((f) => (
                            <option key={f.id} value={f.id}>{f.name} ({f.cut_count} corte{f.cut_count !== 1 ? 's' : ''})</option>
                          ))}
                        </select>
                        <button
                          onClick={handleApplyFurniture}
                          disabled={!selectedFurnitureId || applyingFurniture}
                          className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                        >
                          {applyingFurniture ? 'Importando...' : 'Agregar cortes'}
                        </button>
                      </div>
                      <p className="mt-1.5 text-[11px] text-blue-500">Los cortes del mueble se añadirán como componentes de este pedido</p>
                    </div>
                  )}

                  {/* Add item form */}
                  <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Agregar componente</h4>
                    <form onSubmit={handleAddItem} className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[11px] text-neutral-500 mb-0.5">Material</label>
                        <select
                          value={itemForm.material}
                          onChange={(e) => setItemForm((p) => ({ ...p, material: e.target.value }))}
                          className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-neutral-500 mb-0.5">Ancho mm *</label>
                        <input
                          type="number" min="1" required
                          value={itemForm.width_mm}
                          onChange={(e) => setItemForm((p) => ({ ...p, width_mm: e.target.value }))}
                          placeholder="ej. 600"
                          className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-neutral-500 mb-0.5">Alto mm *</label>
                        <input
                          type="number" min="1" required
                          value={itemForm.height_mm}
                          onChange={(e) => setItemForm((p) => ({ ...p, height_mm: e.target.value }))}
                          placeholder="ej. 900"
                          className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-neutral-500 mb-0.5">Cantidad</label>
                        <input
                          type="number" min="1"
                          value={itemForm.quantity}
                          onChange={(e) => setItemForm((p) => ({ ...p, quantity: e.target.value }))}
                          className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-neutral-500 mb-0.5">Costo unitario</label>
                        <input
                          type="number" min="0" step="0.01"
                          value={itemForm.unit_cost}
                          onChange={(e) => setItemForm((p) => ({ ...p, unit_cost: e.target.value }))}
                          placeholder="0"
                          className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[11px] text-neutral-500 mb-0.5">Notas (opcional)</label>
                        <input
                          type="text"
                          value={itemForm.notes}
                          onChange={(e) => setItemForm((p) => ({ ...p, notes: e.target.value }))}
                          placeholder="ej. pintura blanca"
                          className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>

                      <div className="col-span-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={addingItem}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60 transition-colors"
                        >
                          {addingItem ? 'Agregando...' : 'Agregar'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Confirm button (DRAFT only) */}
                  {selected.status === 'DRAFT' && (
                    <button
                      onClick={() => handleStatusChange('CONFIRMED')}
                      disabled={confirmingStatus}
                      className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                    >
                      {confirmingStatus ? 'Confirmando...' : 'Confirmar pedido'}
                    </button>
                  )}
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── New order modal ── */}
      <AnimatePresence>
        {showNewModal && (
          <motion.div
            key="new-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowNewModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-900">Nuevo pedido</h2>
                <button onClick={() => setShowNewModal(false)} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
                </button>
              </div>

              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                {/* Furniture selector — required */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Mueble <span className="text-red-500">*</span>
                  </label>
                  {furnitureCatalog.length === 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      No hay muebles en el catálogo.{' '}
                      <a href="/dashboard/crm/catalog" className="underline font-medium" target="_blank">Crea uno aquí</a>
                    </div>
                  ) : (
                    <select
                      required
                      value={newForm.furniture_id}
                      onChange={(e) => {
                        const id = e.target.value;
                        const name = furnitureCatalog.find((f) => f.id === id)?.name ?? '';
                        setNewForm((p) => ({ ...p, furniture_id: id, description: name }));
                      }}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Seleccionar mueble...</option>
                      {furnitureCatalog.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} — {f.cut_count} corte{f.cut_count !== 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="mt-1 text-[11px] text-neutral-400">Los cortes del mueble se agregarán automáticamente al pedido</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Descripción</label>
                  <input
                    type="text"
                    value={newForm.description}
                    onChange={(e) => setNewForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="ej. Ropero 3 puertas"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Cliente (CRM)</label>
                  <select
                    value={newForm.crm_contact_id}
                    onChange={(e) => setNewForm((p) => ({ ...p, crm_contact_id: e.target.value }))}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sin cliente</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>{contactLabel(c)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Notas</label>
                  <textarea
                    rows={3}
                    value={newForm.notes}
                    onChange={(e) => setNewForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Observaciones internas..."
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="rounded-lg bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60 transition-colors"
                  >
                    {creating ? 'Creando...' : 'Crear pedido'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stock warning confirmation dialog ── */}
      <AnimatePresence>
        {showStockWarning && pendingStatus && (
          <motion.div
            key="stock-warning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-3 flex items-start gap-3">
                <span className="flex-shrink-0 text-amber-500">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M11 2L2 19h18L11 2z"/><path d="M11 9v4M11 16v.5"/></svg>
                </span>
                <div>
                  <h3 className="font-semibold text-neutral-900">Stock insuficiente</h3>
                  <p className="text-sm text-neutral-600 mt-1">
                    Algunos materiales no tienen stock suficiente. ¿Confirmar el pedido de todas formas?
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setShowStockWarning(false); setPendingStatus(null); }}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => applyStatusChange(pendingStatus)}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  Confirmar igualmente
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
