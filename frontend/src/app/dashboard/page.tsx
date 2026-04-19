'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { pageTransition, staggerContainer, staggerItem } from '../../presentation/animations/variants';
import { tokens } from '../../presentation/theme/tokens';
import { useCurrency } from '../../application/context/currency/CurrencyContext';
import { useAuth } from '../../application/context/auth/AuthContext';
import { useEmailCompose } from '../../application/context/email/EmailContext';
import { type WidgetDef, WIDGET_CATALOG, loadWidgetPrefs, saveWidgetPrefs, loadWidgetOrder, saveWidgetOrder } from './widgets';
import { useTranslation } from '../../application/context/locale/LocaleContext';
import type { TranslationKey } from '../../application/i18n/translations';

// ---------------------------------------------------------------------------
// Greeting
// ---------------------------------------------------------------------------

function getGreetingKey(): TranslationKey {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'greeting.morning';
  if (h >= 12 && h < 18) return 'greeting.afternoon';
  return 'greeting.evening';
}
function getDateStr(): string {
  const formatted = new Intl.DateTimeFormat('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());
  // Capitalize only the first letter (weekday) — leave "de" in lowercase per Spanish grammar.
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const REVENUE_TREND: { mes: string; ingreso: number; gasto: number }[] = [];
const CHANNEL_SPEND: { canal: string; gasto: number; conversiones: number }[] = [];
const PIPELINE_TREND: { sem: string; valor: number }[] = [];
const IMPORTANT_EMAILS: { id: number; from: string; subject: string; time: string; avatar: string; color: string; unread: boolean }[] = [];
const RECENT_DEALS: { name: string; stage: string; value: number; prob: number }[] = [];
const SII_ALERTS: { label: string; value?: number; warn?: boolean; money?: number; date?: string }[] = [];

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const IconPipeline   = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 13l4-5 3 3 7-8"/></svg>;
const IconRevenue    = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="4" width="14" height="10" rx="2"/><path d="M9 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/><path d="M5.5 4V2m7 2V2"/></svg>;
const IconCampaigns  = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M15 3l-6 4H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h5l6 4V3z"/></svg>;
const IconSii        = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="2" width="12" height="14" rx="1"/><path d="M6 5h6M6 8h6M6 11h3"/></svg>;
const IconTask       = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="2" width="12" height="14" rx="1.5"/><path d="M6 7l2 2 4-4M6 11h6"/></svg>;
const IconInventory  = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="14" height="9" rx="1"/><path d="M5 7V5a4 4 0 0 1 8 0v2"/><path d="M9 11v3"/></svg>;
const IconSliders    = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4h12M2 8h12M2 12h12"/><circle cx="5" cy="4" r="1.5" fill="white"/><circle cx="10" cy="8" r="1.5" fill="white"/><circle cx="6" cy="12" r="1.5" fill="white"/></svg>;
const IconClose      = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiMini({ label, value, delta, positive, icon }: {
  label: string; value: string; delta?: string; positive?: boolean; icon: React.ReactNode;
}) {
  return (
    <motion.div variants={staggerItem}
      className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-neutral-900 mb-1">{value}</p>
      <span className={`text-xs font-semibold ${positive ? 'text-green-600' : 'text-red-500'}`}>
        {positive ? '↑' : '↓'} {delta} <span className="font-normal text-neutral-400">vs mes anterior</span>
      </span>
    </motion.div>
  );
}

function ChartTooltip({ active, payload, label, fmtMoney }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-neutral-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {fmtMoney(p.value)}</p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Customize Panel
// ---------------------------------------------------------------------------

const IconDragHandle = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 3.5h10M2 7h10M2 10.5h10" />
  </svg>
);

function CustomizePanel({
  enabled,
  onToggle,
  order,
  onReorder,
  onClose,
}: {
  enabled: Set<string>;
  onToggle: (id: string) => void;
  order: string[];
  onReorder: (order: string[]) => void;
  onClose: () => void;
}) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);

  // Build the widget list in order, falling back to catalog order for any missing ids
  const orderedWidgets: WidgetDef[] = order
    .map(id => WIDGET_CATALOG.find(w => w.id === id))
    .filter((w): w is WidgetDef => w !== undefined);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-neutral-900/20 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed right-0 top-0 z-50 h-screen w-80 overflow-y-auto border-l border-neutral-200 bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Personalizar Dashboard</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Arrastra para reordenar</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors">
            <IconClose />
          </button>
        </div>

        <div className="p-5 space-y-2">
          {orderedWidgets.map(widget => {
            const isOn = enabled.has(widget.id);
            const isDragTarget = dragOverId === widget.id;
            return (
              <button
                key={widget.id}
                draggable={true}
                onDragStart={() => { dragIdRef.current = widget.id; }}
                onDragOver={(e) => { e.preventDefault(); setDragOverId(widget.id); }}
                onDragLeave={() => setDragOverId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!dragIdRef.current || dragIdRef.current === widget.id) { setDragOverId(null); return; }
                  const from = order.indexOf(dragIdRef.current);
                  const to = order.indexOf(widget.id);
                  if (from === -1 || to === -1) { setDragOverId(null); return; }
                  const next = [...order];
                  next.splice(from, 1);
                  next.splice(to, 0, dragIdRef.current);
                  onReorder(next);
                  setDragOverId(null);
                }}
                onClick={() => onToggle(widget.id)}
                className={`w-full flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition-all duration-150 ${
                  isDragTarget
                    ? 'border-blue-400 bg-blue-50'
                    : isOn
                    ? 'border-primary-200 bg-primary-50'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50'
                }`}
              >
                {/* Drag handle */}
                <span className="flex-shrink-0 text-neutral-300 cursor-grab active:cursor-grabbing">
                  <IconDragHandle />
                </span>
                <div className="min-w-0 flex-1 pr-2">
                  <p className={`text-sm font-semibold ${isOn ? 'text-primary-800' : 'text-neutral-700'}`}>
                    {widget.label}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">{widget.description}</p>
                </div>
                {/* Toggle pill */}
                <div className={`flex-shrink-0 relative h-5 w-9 rounded-full transition-colors duration-200 ${isOn ? 'bg-primary-500' : 'bg-neutral-200'}`}>
                  <motion.div
                    animate={{ x: isOn ? 16 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow"
                  />
                </div>
              </button>
            );
          })}

          <button
            onClick={() => {
              WIDGET_CATALOG.forEach(w => { if (!enabled.has(w.id)) onToggle(w.id); });
            }}
            className="w-full rounded-xl border border-neutral-200 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors mt-4"
          >
            Activar todos
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { fmt, fmtShort, code: currCode } = useCurrency();
  const { user } = useAuth();
  const { starred, isLoadingInbox } = useEmailCompose();
  const { t } = useTranslation();

  const [dateStr, setDateStr]       = useState('');
  const [enabled, setEnabled]       = useState<Set<string>>(new Set());
  const [widgetOrder, setWidgetOrder] = useState<string[]>([]);
  const [showCustomize, setShowCustomize] = useState(false);

  // Computed greeting — re-evaluates whenever locale changes
  const greeting = t(getGreetingKey());

  // BPMS tasks state
  const [bpmsTasks, setBpmsTasks] = useState<{ id: string; name: string; role: string; dueIn: string; overdue: boolean }[]>([]);
  // SCM state
  const [scmData, setScmData] = useState({ availableBoards: 0, activeOrders: 0, availableOffcuts: 0, areaM2: 0 });
  // KPI state
  const [kpi, setKpi] = useState({ pipeline: 0, campaigns: 0, siiEmitidas: 0, siiPendientes: 0, pendingInvoices: 0, activeDeals: 0 });

  // Hydrate from localStorage on client only
  useEffect(() => {
    setDateStr(getDateStr());
    setEnabled(loadWidgetPrefs());
    setWidgetOrder(loadWidgetOrder());
  }, []);

  // Fetch BPMS tasks
  useEffect(() => {
    fetch('/api/bpms/tasks?limit=5', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.resolve({ items: [] }))
      .then(data => setBpmsTasks(data.items ?? data ?? []))
      .catch(() => setBpmsTasks([]));
  }, []);

  // Fetch KPIs from real APIs
  useEffect(() => {
    Promise.allSettled([
      fetch('/api/crm/deals?limit=200', { cache: 'no-store' }),
      fetch('/api/marketing/campaigns?limit=200', { cache: 'no-store' }),
      fetch('/api/sii/facturas?tipo=emitidas&limit=200', { cache: 'no-store' }),
      fetch('/api/erp/journal?status=DRAFT&limit=200', { cache: 'no-store' }),
    ]).then(async ([dealsRes, campaignsRes, siiRes, journalRes]) => {
      const deals = dealsRes.status === 'fulfilled' && dealsRes.value.ok ? await dealsRes.value.json() : {};
      const campaigns = campaignsRes.status === 'fulfilled' && campaignsRes.value.ok ? await campaignsRes.value.json() : {};
      const sii = siiRes.status === 'fulfilled' && siiRes.value.ok ? await siiRes.value.json() : {};
      const journal = journalRes.status === 'fulfilled' && journalRes.value.ok ? await journalRes.value.json() : {};

      const dealItems: { value?: number; amount?: number; stage?: string }[] = deals.records ?? deals.items ?? [];
      const pipeline = dealItems.reduce((s, d) => s + (d.value ?? d.amount ?? 0), 0);
      const activeDeals = dealItems.filter(d => d.stage && d.stage !== 'CLOSED_WON' && d.stage !== 'CLOSED_LOST').length;

      const campaignItems: { status?: string }[] = campaigns.items ?? campaigns.data ?? [];
      const activeCampaigns = campaignItems.filter(c => c.status === 'RUNNING' || c.status === 'SCHEDULED').length;

      const facturas: { status?: string }[] = sii.emitidas ?? sii.items ?? [];
      const siiEmitidas = facturas.length;
      const siiPendientes = facturas.filter(f => f.status === 'PENDIENTE').length;

      const journalItems: { status?: string }[] = journal.items ?? [];
      const pendingInvoices = journalItems.filter(j => j.status === 'DRAFT').length;

      setKpi({ pipeline, campaigns: activeCampaigns, siiEmitidas, siiPendientes, pendingInvoices, activeDeals });
    }).catch(() => {/* leave zeros */});
  }, []);

  // Fetch SCM inventory counts
  useEffect(() => {
    Promise.all([
      fetch('/api/scm/inventory', { cache: 'no-store' }),
      fetch('/api/scm/work-orders', { cache: 'no-store' }),
    ])
      .then(async ([invRes, woRes]) => {
        const inv = invRes.ok ? await invRes.json() : {};
        const wo  = woRes.ok  ? await woRes.json()  : {};
        const boards  = inv.boards  ?? [];
        const offcuts = inv.offcuts ?? [];
        const orders  = wo.items    ?? wo ?? [];
        const availableBoards   = boards.filter((b: { status: string }) => b.status === 'AVAILABLE').length;
        const availableOffcuts  = offcuts.filter((o: { status: string }) => o.status === 'AVAILABLE').length;
        const totalAreaMm2 = boards
          .filter((b: { status: string; widthMm: number; heightMm: number }) => b.status === 'AVAILABLE')
          .reduce((s: number, b: { widthMm: number; heightMm: number }) => s + b.widthMm * b.heightMm, 0);
        const activeOrders = orders.filter(
          (o: { status: string }) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED',
        ).length;
        setScmData({ availableBoards, availableOffcuts, activeOrders, areaM2: +(totalAreaMm2 / 1_000_000).toFixed(2) });
      })
      .catch(() => {/* leave zeros */});
  }, []);

  const toggleWidget = useCallback((id: string) => {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveWidgetPrefs(next);
      return next;
    });
  }, []);

  const has = (id: string) => enabled.has(id);

  const userName = user?.fullName?.trim().split(' ')[0] || 'Usuario';

  const displayEmails = (!isLoadingInbox && starred.length > 0)
    ? starred.slice(0, 5).map((e, i) => {
        const safeName = e.from || e.fromEmail || '?';
        const nameInitials = safeName.split(' ').filter(Boolean);
        const avatar = nameInitials.length >= 2
          ? ((nameInitials[0][0] ?? '') + (nameInitials[1][0] ?? '')).toUpperCase()
          : safeName.slice(0, 2).toUpperCase();
        const colors = ['bg-red-500', 'bg-blue-600', 'bg-emerald-600', 'bg-blue-800', 'bg-orange-500'];
        const date = new Date(e.date);
        const diffH = (Date.now() - date.getTime()) / 3_600_000;
        const time = diffH < 1 ? `Hace ${Math.round(diffH * 60)} min`
          : diffH < 24 ? `Hace ${Math.round(diffH)} horas`
          : diffH < 48 ? 'Ayer'
          : date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
        return { id: i + 1, from: safeName, subject: e.subject, time, avatar, color: colors[i % colors.length], unread: e.isUnread };
      })
    : IMPORTANT_EMAILS;

  // Effective order: fall back to catalog order on first render (before localStorage hydrates)
  const effectiveOrder = widgetOrder.length > 0 ? widgetOrder : WIDGET_CATALOG.map(w => w.id);

  // ---------------------------------------------------------------------------
  // renderWidget — returns JSX for a single widget id, or null if disabled
  // ---------------------------------------------------------------------------
  function renderWidget(id: string): React.ReactNode {
    if (!has(id)) return null;

    switch (id) {
      case 'kpis':
        return (
          <motion.div
            key="kpis"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
              <KpiMini label="Pipeline total"   value={kpi.pipeline > 0 ? fmtShort(kpi.pipeline) : '—'} delta={kpi.activeDeals > 0 ? `${kpi.activeDeals} activos` : undefined} positive icon={<IconPipeline />} />
              <KpiMini label="Deals activos"    value={kpi.activeDeals > 0 ? String(kpi.activeDeals) : '—'} icon={<IconRevenue />} />
              <KpiMini label="Campañas activas" value={kpi.campaigns > 0 ? String(kpi.campaigns) : '—'} icon={<IconCampaigns />} />
              <KpiMini label="Facturas SII"     value={kpi.siiEmitidas > 0 ? `${kpi.siiEmitidas} emitidas` : '—'} delta={kpi.siiPendientes > 0 ? `${kpi.siiPendientes} pend.` : undefined} positive={kpi.siiPendientes === 0} icon={<IconSii />} />
            </motion.div>
          </motion.div>
        );

      case 'revenue-chart':
        return (
          <motion.div
            key="revenue-chart"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm font-bold text-neutral-800">Ingresos vs Gastos</p>
                <p className="text-xs text-neutral-400">Últimos 6 meses</p>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary-500" /> Ingresos</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Gastos</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={REVENUE_TREND}>
                <defs>
                  <linearGradient id="gIngreso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={tokens.colors.primary[500]} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={tokens.colors.primary[500]} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gGasto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`} width={40} />
                <Tooltip content={<ChartTooltip fmtMoney={fmt} />} />
                <Area type="monotone" dataKey="ingreso" name="Ingresos" stroke={tokens.colors.primary[500]} strokeWidth={2}
                  fill="url(#gIngreso)" dot={{ r: 3, fill: tokens.colors.primary[500] }} />
                <Area type="monotone" dataKey="gasto"   name="Gastos"   stroke="#F59E0B"                    strokeWidth={2}
                  fill="url(#gGasto)"   dot={{ r: 3, fill: '#F59E0B' }} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        );

      case 'pipeline-chart':
        return (
          <motion.div
            key="pipeline-chart"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-bold text-neutral-800 mb-1">Pipeline — Evolución</p>
            <p className="text-xs text-neutral-400 mb-6">Valor acumulado por semana</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={PIPELINE_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="sem" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`} width={40} />
                <Tooltip content={<ChartTooltip fmtMoney={fmt} />} />
                <Bar dataKey="valor" name="Pipeline" fill={tokens.colors.primary[500]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        );

      case 'emails':
        return (
          <div key="emails" className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <p className="text-sm font-bold text-neutral-800">Correos importantes</p>
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-600">
                {displayEmails.filter(e => e.unread).length} nuevos
              </span>
            </div>
            <div className="divide-y divide-neutral-50">
              {displayEmails.map(email => (
                <div key={email.id}
                  className={`flex items-start gap-3 px-5 py-3 hover:bg-neutral-50 cursor-pointer transition-colors ${email.unread ? 'bg-primary-50/30' : ''}`}
                >
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${email.color}`}>
                    {email.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs truncate ${email.unread ? 'font-bold text-neutral-900' : 'font-medium text-neutral-700'}`}>{email.from}</p>
                      <span className="text-[10px] text-neutral-400 whitespace-nowrap ml-2">{email.time}</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">{email.subject}</p>
                  </div>
                  {email.unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-500" />}
                </div>
              ))}
            </div>
          </div>
        );

      case 'deals':
        return (
          <div key="deals" className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <p className="text-sm font-bold text-neutral-800">Deals recientes</p>
              <Link href="/dashboard/crm/deals" className="text-[11px] font-semibold text-primary-600 hover:text-primary-700">Ver pipeline</Link>
            </div>
            <div className="divide-y divide-neutral-50">
              {RECENT_DEALS.map((deal, i) => (
                <div key={i} className="px-5 py-3 hover:bg-neutral-50 cursor-pointer transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-neutral-800 truncate">{deal.name}</p>
                    <p className="text-xs font-bold text-neutral-900 whitespace-nowrap ml-2">
                      {fmtShort(deal.value)} <span className="text-[0.65em] font-normal text-neutral-400">{currCode}</span>
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      deal.stage === 'Cerrado'       ? 'bg-green-50 text-green-700'  :
                      deal.stage === 'Negociación'   ? 'bg-blue-50 text-blue-700'    :
                      deal.stage === 'Propuesta'     ? 'bg-purple-50 text-purple-700':
                      'bg-neutral-100 text-neutral-600'
                    }`}>{deal.stage}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-neutral-100 overflow-hidden">
                        <div className="h-full rounded-full bg-primary-500" style={{ width: `${deal.prob}%` }} />
                      </div>
                      <span className="text-[10px] text-neutral-400">{deal.prob}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'channel-spend':
        return (
          <div key="channel-spend" className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <p className="text-sm font-bold text-neutral-800">Gasto por canal</p>
              <p className="text-xs text-neutral-400">Marketing — mes actual</p>
            </div>
            <div className="px-5 pb-5">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={CHANNEL_SPEND} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)}M`} />
                  <YAxis type="category" dataKey="canal" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip content={<ChartTooltip fmtMoney={fmt} />} />
                  <Bar dataKey="gasto" name="Gasto" fill={tokens.colors.primary[400]} radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'sii-summary':
        return (
          <motion.div
            key="sii-summary"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600"><IconSii /></span>
                <div>
                  <p className="text-sm font-bold text-neutral-800">Resumen SII — Abril 2026</p>
                  <p className="text-[11px] text-neutral-400">Servicio de Impuestos Internos</p>
                </div>
              </div>
              <Link href="/dashboard/sii" className="text-[11px] font-semibold text-primary-600 hover:text-primary-700">Ir a SII</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {SII_ALERTS.map((item, i) => (
                <div key={i} className="rounded-lg bg-neutral-50 p-3">
                  <p className="text-[11px] text-neutral-500 mb-1">{item.label}</p>
                  {item.money ? (
                    <p className="text-lg font-bold text-neutral-900">
                      ${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(item.money)}
                      <span className="ml-0.5 text-[0.65em] font-normal text-neutral-400">CLP</span>
                    </p>
                  ) : item.date ? (
                    <p className="text-lg font-bold text-neutral-900">
                      {new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' }).format(new Date(item.date))}
                    </p>
                  ) : (
                    <p className={`text-lg font-bold ${item.warn ? 'text-amber-600' : 'text-neutral-900'}`}>{item.value}</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        );

      case 'bpms-tasks':
        return (
          <motion.div
            key="bpms-tasks"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><IconTask /></span>
                <div>
                  <p className="text-sm font-bold text-neutral-800">Mis Tareas BPMS</p>
                  <p className="text-[11px] text-neutral-400">{bpmsTasks.filter(t => t.overdue).length} vencidas</p>
                </div>
              </div>
              <Link href="/dashboard/bpms/tasks" className="text-[11px] font-semibold text-primary-600 hover:text-primary-700">Ver todas</Link>
            </div>
            <div className="space-y-2">
              {bpmsTasks.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-4">No hay tareas pendientes.</p>
              ) : bpmsTasks.map(task => (
                <div key={task.id} className={`flex items-center justify-between rounded-lg px-3 py-2.5 border ${task.overdue ? 'border-red-200 bg-red-50' : 'border-neutral-100 bg-neutral-50'}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${task.overdue ? 'bg-red-500' : 'bg-blue-400'}`} />
                    <p className="text-xs font-medium text-neutral-800 truncate">{task.name}</p>
                    <span className="flex-shrink-0 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] text-neutral-600">
                      {task.role.replace('_', ' ')}
                    </span>
                  </div>
                  <span className={`ml-3 flex-shrink-0 text-[11px] font-semibold ${task.overdue ? 'text-red-600' : 'text-neutral-500'}`}>
                    {task.overdue ? '⚠️ Vencida' : `Vence ${task.dueIn}`}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        );

      case 'scm-status':
        return (
          <motion.div
            key="scm-status"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><IconInventory /></span>
                <div>
                  <p className="text-sm font-bold text-neutral-800">Estado SCM — Inventario</p>
                  <p className="text-[11px] text-neutral-400">Planchas, retazos y órdenes activas</p>
                </div>
              </div>
              <Link href="/dashboard/scm/inventory" className="text-[11px] font-semibold text-primary-600 hover:text-primary-700">Ver inventario</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: 'Planchas disponibles', value: scmData.availableBoards, color: 'text-green-700' },
                { label: 'Retazos disponibles',  value: scmData.availableOffcuts, color: 'text-green-700' },
                { label: 'Órdenes activas',       value: scmData.activeOrders,    color: 'text-blue-700' },
                { label: 'Área disponible',       value: `${scmData.areaM2} m²`,  color: 'text-neutral-900' },
              ].map((item, i) => (
                <div key={i} className="rounded-lg bg-neutral-50 p-3">
                  <p className="text-[11px] text-neutral-500 mb-1">{item.label}</p>
                  <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Chart pair helper — revenue-chart and pipeline-chart share a grid when
  // both are consecutive in the order; otherwise each renders full-width.
  // Bottom-row widgets (emails, deals, channel-spend) also share a dynamic grid
  // when they appear consecutively.
  // ---------------------------------------------------------------------------
  const CHART_IDS = new Set(['revenue-chart', 'pipeline-chart']);
  const BOTTOM_IDS = new Set(['emails', 'deals', 'channel-spend']);

  function renderOrderedWidgets(): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    let i = 0;
    while (i < effectiveOrder.length) {
      const id = effectiveOrder[i];

      // --- Chart pair ---
      if (CHART_IDS.has(id)) {
        const next = effectiveOrder[i + 1];
        const bothEnabled = has(id) && next && CHART_IDS.has(next) && has(next);
        if (bothEnabled) {
          // Render both charts side-by-side in a grid-cols-5 layout
          const idA = id;
          const idB = next;
          const revenueId = idA === 'revenue-chart' ? idA : idB;
          const pipelineId = idA === 'pipeline-chart' ? idA : idB;
          nodes.push(
            <AnimatePresence key={`chart-pair-${idA}-${idB}`}>
              <motion.div
                key="charts"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-5"
              >
                {/* revenue-chart always in col-span-3 */}
                <motion.div
                  key={revenueId}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="xl:col-span-3 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-sm font-bold text-neutral-800">Ingresos vs Gastos</p>
                      <p className="text-xs text-neutral-400">Últimos 6 meses</p>
                    </div>
                    <div className="flex items-center gap-4 text-[11px]">
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary-500" /> Ingresos</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Gastos</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={REVENUE_TREND}>
                      <defs>
                        <linearGradient id="gIngreso" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={tokens.colors.primary[500]} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={tokens.colors.primary[500]} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gGasto" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`} width={40} />
                      <Tooltip content={<ChartTooltip fmtMoney={fmt} />} />
                      <Area type="monotone" dataKey="ingreso" name="Ingresos" stroke={tokens.colors.primary[500]} strokeWidth={2}
                        fill="url(#gIngreso)" dot={{ r: 3, fill: tokens.colors.primary[500] }} />
                      <Area type="monotone" dataKey="gasto"   name="Gastos"   stroke="#F59E0B"                    strokeWidth={2}
                        fill="url(#gGasto)"   dot={{ r: 3, fill: '#F59E0B' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
                {/* pipeline-chart always in col-span-2 */}
                <motion.div
                  key={pipelineId}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="xl:col-span-2 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-bold text-neutral-800 mb-1">Pipeline — Evolución</p>
                  <p className="text-xs text-neutral-400 mb-6">Valor acumulado por semana</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={PIPELINE_TREND}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="sem" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`} width={40} />
                      <Tooltip content={<ChartTooltip fmtMoney={fmt} />} />
                      <Bar dataKey="valor" name="Pipeline" fill={tokens.colors.primary[500]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          );
          i += 2; // consumed two slots
          continue;
        }
        // Only one chart enabled (or not consecutive) — render full-width
        if (has(id)) {
          nodes.push(
            <AnimatePresence key={`chart-solo-${id}`}>
              {renderWidget(id)}
            </AnimatePresence>
          );
        }
        i++;
        continue;
      }

      // --- Bottom-row group (emails / deals / channel-spend) ---
      if (BOTTOM_IDS.has(id)) {
        // Collect a contiguous run of bottom-row ids
        const groupIds: string[] = [];
        let j = i;
        while (j < effectiveOrder.length && BOTTOM_IDS.has(effectiveOrder[j])) {
          groupIds.push(effectiveOrder[j]);
          j++;
        }
        const activeGroup = groupIds.filter(gid => has(gid));
        if (activeGroup.length > 0) {
          const cols = activeGroup.length === 3 ? 'grid-cols-3' : activeGroup.length === 2 ? 'grid-cols-2' : 'grid-cols-1';
          nodes.push(
            <AnimatePresence key={`bottom-row-${groupIds.join('-')}`}>
              <motion.div
                key="bottom-row"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className={`grid gap-6 ${cols}`}
              >
                {groupIds.map(gid => renderWidget(gid))}
              </motion.div>
            </AnimatePresence>
          );
        }
        i = j; // skip the whole group
        continue;
      }

      // --- All other widgets ---
      if (has(id)) {
        nodes.push(
          <AnimatePresence key={`widget-${id}`}>
            {renderWidget(id)}
          </AnimatePresence>
        );
      }
      i++;
    }
    return nodes;
  }

  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" className="p-6 space-y-6">

      {/* Greeting Banner + Customize button */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 p-6 text-white shadow-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary-100">{dateStr}</p>
            <h1 className="mt-1 text-2xl font-bold">{greeting}, {userName}</h1>
            <p className="mt-1 text-sm text-primary-200">
              {kpi.pendingInvoices > 0 && <><span className="font-bold text-white">{kpi.pendingInvoices} {kpi.pendingInvoices === 1 ? 'asiento borrador' : 'asientos borrador'}</span>{' '}pendientes.{' '}</>}
              {kpi.activeDeals > 0 && <><span className="font-bold text-white">{kpi.activeDeals} {kpi.activeDeals === 1 ? 'deal activo' : 'deals activos'}</span> en CRM.</>}
              {kpi.pendingInvoices === 0 && kpi.activeDeals === 0 && <span>Todo al día. ¡Buen trabajo!</span>}
            </p>
          </div>
          <button
            onClick={() => setShowCustomize(true)}
            className="flex-shrink-0 flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/20 backdrop-blur-sm"
          >
            <IconSliders />
            Personalizar
          </button>
        </div>
      </motion.div>

      {/* Dynamic widget render — order driven by widgetOrder / WIDGET_CATALOG */}
      {renderOrderedWidgets()}

      {/* Empty state when all widgets are off */}
      <AnimatePresence>
        {enabled.size === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
              <IconSliders />
            </div>
            <p className="text-base font-semibold text-neutral-600">Dashboard vacío</p>
            <p className="mt-1 text-sm text-neutral-400">Activa widgets usando el botón Personalizar</p>
            <button
              onClick={() => setShowCustomize(true)}
              className="mt-5 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
            >
              Personalizar dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customize panel */}
      <AnimatePresence>
        {showCustomize && (
          <CustomizePanel
            enabled={enabled}
            onToggle={toggleWidget}
            order={widgetOrder}
            onReorder={(newOrder) => {
              setWidgetOrder(newOrder);
              saveWidgetOrder(newOrder);
            }}
            onClose={() => setShowCustomize(false)}
          />
        )}
      </AnimatePresence>

    </motion.div>
  );
}
