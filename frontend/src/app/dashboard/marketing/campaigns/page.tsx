'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransition, staggerContainer, staggerItem } from '../../../../presentation/animations/variants';
import TopBar from '../../../../presentation/components/layout/TopBar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CampaignChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'META' | 'GOOGLE_ADS';
type CampaignStatus  = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

interface Campaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHANNEL_STYLE: Record<CampaignChannel, { label: string; className: string }> = {
  EMAIL:      { label: 'Email',      className: 'bg-purple-100 text-purple-800' },
  SMS:        { label: 'SMS',        className: 'bg-teal-100 text-teal-800' },
  WHATSAPP:   { label: 'WhatsApp',   className: 'bg-green-100 text-green-800' },
  META:       { label: 'Meta',       className: 'bg-blue-100 text-blue-800' },
  GOOGLE_ADS: { label: 'Google Ads', className: 'bg-red-100 text-red-700' },
};

const STATUS_STYLE: Record<CampaignStatus, { label: string; className: string; dot: string }> = {
  DRAFT:     { label: 'Borrador',    className: 'bg-neutral-100 text-neutral-600 border-neutral-200', dot: 'bg-neutral-400' },
  SCHEDULED: { label: 'Programada', className: 'bg-blue-50 text-blue-700 border-blue-200',           dot: 'bg-blue-500' },
  RUNNING:   { label: 'Activa',     className: 'bg-green-50 text-green-700 border-green-200',        dot: 'bg-green-500' },
  PAUSED:    { label: 'Pausada',    className: 'bg-amber-50 text-amber-700 border-amber-200',        dot: 'bg-amber-400' },
  COMPLETED: { label: 'Completada', className: 'bg-indigo-50 text-indigo-700 border-indigo-200',     dot: 'bg-indigo-500' },
  CANCELLED: { label: 'Cancelada',  className: 'bg-red-50 text-red-600 border-red-200',              dot: 'bg-red-400' },
};

const STATUS_FILTERS: { key: CampaignStatus | 'all'; label: string }[] = [
  { key: 'all',       label: 'Todas' },
  { key: 'RUNNING',   label: 'Activas' },
  { key: 'SCHEDULED', label: 'Programadas' },
  { key: 'PAUSED',    label: 'Pausadas' },
  { key: 'COMPLETED', label: 'Completadas' },
  { key: 'DRAFT',     label: 'Borradores' },
];

const CHANNEL_OPTIONS: { value: CampaignChannel; label: string }[] = [
  { value: 'EMAIL',      label: 'Email' },
  { value: 'SMS',        label: 'SMS' },
  { value: 'WHATSAPP',   label: 'WhatsApp' },
  { value: 'META',       label: 'Meta' },
  { value: 'GOOGLE_ADS', label: 'Google Ads' },
];

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));
}

// ---------------------------------------------------------------------------
// Nueva Campaña Modal
// ---------------------------------------------------------------------------

interface NewCampaignModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function NewCampaignModal({ onClose, onCreated }: NewCampaignModalProps) {
  const [name, setName]           = useState('');
  const [channel, setChannel]     = useState<CampaignChannel>('EMAIL');
  const [scheduled, setScheduled] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), channel, scheduledAt: scheduled || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      onCreated();
    } catch {
      setError('Error al crear campaña. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-neutral-900/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
            <h2 className="text-sm font-bold text-neutral-900">Nueva campaña</h2>
            <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 2l10 10M12 2L2 12"/></svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Nombre *</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Newsletter Abril 2026"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Canal</label>
              <select
                value={channel}
                onChange={e => setChannel(e.target.value as CampaignChannel)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-400 bg-white"
              >
                {CHANNEL_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Fecha programada (opcional)</label>
              <input
                type="datetime-local"
                value={scheduled}
                onChange={e => setScheduled(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
              />
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 rounded-lg border border-neutral-200 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 rounded-lg bg-primary-500 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60">
                {loading ? 'Creando...' : 'Crear campaña'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<CampaignStatus | 'all'>('all');
  const [search, setSearch]       = useState('');
  const [showNew, setShowNew]     = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/marketing/campaigns?limit=100', { cache: 'no-store' });
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setCampaigns(data.items ?? data ?? []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const displayed = campaigns.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search.trim()) return c.name.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const countByStatus = (s: CampaignStatus | 'all') =>
    s === 'all' ? campaigns.length : campaigns.filter(c => c.status === s).length;

  return (
    <>
      <TopBar title="Campañas" subtitle="Marketing — Gestión de campañas" />

      <motion.div variants={pageTransition} initial="initial" animate="animate" className="p-4 sm:p-6 lg:p-8">

        {/* Aviso integración RRSS */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
            <path d="M8 1l7 13H1L8 1z"/><path d="M8 6v4M8 11.5v.5"/>
          </svg>
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Métricas de rendimiento pendientes.</span>{' '}
            La integración con Meta, Google Ads, TikTok y LinkedIn está pendiente. Las campañas aquí son internas — las métricas (impresiones, clics, CPA) estarán disponibles al conectar cada plataforma.
          </p>
        </div>

        {/* Tabla */}
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3">
            <div className="flex items-center gap-1 flex-wrap">
              {STATUS_FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    filter === f.key ? 'bg-primary-50 text-primary-700' : 'text-neutral-500 hover:bg-neutral-50'
                  }`}
                >
                  {f.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    filter === f.key ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {countByStatus(f.key)}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#9CA3AF" strokeWidth="1.5" className="absolute left-2.5 top-1/2 -translate-y-1/2">
                  <circle cx="5.5" cy="5.5" r="4"/><path d="M9 9l2.5 2.5"/>
                </svg>
                <input
                  type="text"
                  placeholder="Buscar campaña..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="rounded-lg border border-neutral-200 bg-neutral-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary-400 focus:bg-white w-44"
                />
              </div>
              <button
                onClick={() => setShowNew(true)}
                className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 1v10M1 6h10"/></svg>
                Nueva campaña
              </button>
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <div className="space-y-3 p-6">
              {[1,2,3].map(i => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-neutral-100" />
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.2" className="mb-3">
                <path d="M15 3l-6 4H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h5l6 4V3z"/>
              </svg>
              <p className="text-sm font-semibold text-neutral-500">
                {search ? 'Sin resultados' : 'Sin campañas aún'}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                {search ? 'Prueba con otro término de búsqueda' : 'Crea tu primera campaña con el botón «Nueva campaña»'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50">
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-400">Campaña</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-400">Canal</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-400">Estado</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-400">Programada</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-400">Iniciada</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-400">Completada</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-400">Creada</th>
                  </tr>
                </thead>
                <motion.tbody variants={staggerContainer} initial="initial" animate="animate">
                  {displayed.map(c => {
                    const ss = STATUS_STYLE[c.status];
                    const ch = CHANNEL_STYLE[c.channel];
                    return (
                      <motion.tr key={c.id} variants={staggerItem}
                        className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-semibold text-neutral-900">{c.name}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${ch.className}`}>
                            {ch.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${ss.className}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${ss.dot}`} />
                            {ss.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-neutral-500">{fmtDate(c.scheduledAt)}</td>
                        <td className="px-5 py-3.5 text-xs text-neutral-500">{fmtDate(c.startedAt)}</td>
                        <td className="px-5 py-3.5 text-xs text-neutral-500">{fmtDate(c.completedAt)}</td>
                        <td className="px-5 py-3.5 text-xs text-neutral-500">{fmtDate(c.createdAt)}</td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showNew && (
          <NewCampaignModal
            onClose={() => setShowNew(false)}
            onCreated={() => { setShowNew(false); fetchCampaigns(); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
