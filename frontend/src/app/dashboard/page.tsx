'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { pageTransition, staggerContainer, staggerItem } from '../../presentation/animations/variants';
import { tokens } from '../../presentation/theme/tokens';
import { useCurrency } from '../../application/context/currency/CurrencyContext';
import { useAuth } from '../../application/context/auth/AuthContext';
import { useEmailCompose } from '../../application/context/email/EmailContext';

// ---------------------------------------------------------------------------
// Greeting
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function getDateStr(): string {
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date());
}

// ---------------------------------------------------------------------------
// Mock data — represents aggregated data from all modules
// ---------------------------------------------------------------------------

const REVENUE_TREND = [
  { mes: 'Nov', ingreso: 18200000, gasto: 12400000 },
  { mes: 'Dic', ingreso: 22500000, gasto: 14100000 },
  { mes: 'Ene', ingreso: 19800000, gasto: 13200000 },
  { mes: 'Feb', ingreso: 24100000, gasto: 15600000 },
  { mes: 'Mar', ingreso: 28900000, gasto: 16800000 },
  { mes: 'Abr', ingreso: 31200000, gasto: 17400000 },
];

const CHANNEL_SPEND = [
  { canal: 'Google Ads', gasto: 2100000, conversiones: 144 },
  { canal: 'Meta Ads',   gasto: 5137000, conversiones: 126 },
  { canal: 'TikTok',     gasto: 890000,  conversiones: 68 },
  { canal: 'Email',      gasto: 500000,  conversiones: 63 },
  { canal: 'LinkedIn',   gasto: 1650000, conversiones: 14 },
];

const PIPELINE_TREND = [
  { sem: 'S1', valor: 42000000 },
  { sem: 'S2', valor: 58000000 },
  { sem: 'S3', valor: 51000000 },
  { sem: 'S4', valor: 67000000 },
  { sem: 'S5', valor: 74000000 },
  { sem: 'S6', valor: 89000000 },
  { sem: 'S7', valor: 95000000 },
  { sem: 'S8', valor: 107200000 },
];

const IMPORTANT_EMAILS = [
  { id: 1, from: 'Cencosud Retail',     subject: 'Confirmación OC #4892 — Aprobada',       time: 'Hace 25 min', avatar: 'CR', color: 'bg-red-500',    unread: true },
  { id: 2, from: 'UDLA Universidad',    subject: 'Re: Propuesta módulo SCM Q2 2026',        time: 'Hace 1 hora', avatar: 'UU', color: 'bg-blue-600',   unread: true },
  { id: 3, from: 'Fracttal SpA',        subject: 'Factura #1002 — Pago recibido',           time: 'Hace 2 horas',avatar: 'FS', color: 'bg-emerald-600',unread: false },
  { id: 4, from: 'Banco Estado',        subject: 'Notificación transferencia recibida',      time: 'Hace 3 horas',avatar: 'BE', color: 'bg-blue-800',   unread: false },
  { id: 5, from: 'Sodimac S.A.',        subject: 'Actualización estado pedido #7712',        time: 'Ayer',        avatar: 'SD', color: 'bg-orange-500', unread: false },
];

const RECENT_DEALS = [
  { name: 'Módulo SCM — Cencosud',   stage: 'Negociación', value: 18000000, prob: 60 },
  { name: 'ERP Cloud — Falabella',    stage: 'Propuesta',   value: 35000000, prob: 15 },
  { name: 'CRM Pro — ICI Ingeniería', stage: 'Cerrado',     value: 12500000, prob: 100 },
  { name: 'BPMS Lite — AVEVA',        stage: 'Descubrimiento', value: 8200000, prob: 25 },
];

const SII_ALERTS = [
  { label: 'Facturas emitidas (abril)', value: 8 },
  { label: 'Facturas pendientes',        value: 2, warn: true },
  { label: 'IVA débito acumulado',       money: 2637200 },
  { label: 'Próxima declaración F29',    date: '2026-05-12' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiMini({ label, value, delta, positive, icon }: {
  label: string; value: string; delta: string; positive: boolean; icon: React.ReactNode;
}) {
  return (
    <motion.div variants={staggerItem}
      className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold text-neutral-900 mb-1">{value}</p>
      <span className={`text-xs font-semibold ${positive ? 'text-green-600' : 'text-red-500'}`}>
        {positive ? '\u2191' : '\u2193'} {delta} <span className="font-normal text-neutral-400">vs mes anterior</span>
      </span>
    </motion.div>
  );
}

// Icons
const IconPipeline = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 13l4-5 3 3 7-8" /></svg>
);
const IconRevenue = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="4" width="14" height="10" rx="2" /><path d="M9 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" /><path d="M5.5 4V2m7 2V2" /></svg>
);
const IconCampaigns = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M15 3l-6 4H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h5l6 4V3z" /></svg>
);
const IconSii = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="2" width="12" height="14" rx="1" /><path d="M6 5h6M6 8h6M6 11h3" /></svg>
);

// Custom chart tooltip
function ChartTooltip({ active, payload, label, fmtMoney }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-neutral-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {fmtMoney(p.value)}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { fmt, fmtShort, code: currCode } = useCurrency();
  const { user } = useAuth();
  const { starred, isLoadingInbox } = useEmailCompose();
  const [greeting, setGreeting] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    setGreeting(getGreeting());
    setDateStr(getDateStr());
  }, []);

  const userName = user?.name?.trim().split(' ')[0] || 'Usuario';

  // Map real starred emails to the display format, fall back to mock data
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
        return {
          id: i + 1,
          from: safeName,
          subject: e.subject,
          time,
          avatar,
          color: colors[i % colors.length],
          unread: e.isUnread,
        };
      })
    : IMPORTANT_EMAILS;

  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" className="p-6 space-y-6">

      {/* Greeting Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 p-6 text-white shadow-lg"
      >
        <p className="text-sm font-medium text-primary-100 capitalize">{dateStr}</p>
        <h1 className="mt-1 text-2xl font-bold">{greeting}, {userName}</h1>
        <p className="mt-1 text-sm text-primary-200">Tienes <span className="font-bold text-white">2 facturas pendientes</span> y <span className="font-bold text-white">3 deals</span> en negociación activa.</p>
      </motion.div>

      {/* KPI Row */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-4 gap-5">
        <KpiMini label="Pipeline total" value={`${fmtShort(107200000)}`} delta="14.2%" positive icon={<IconPipeline />} />
        <KpiMini label="Ingreso mensual" value={`${fmtShort(31200000)}`} delta="7.9%" positive icon={<IconRevenue />} />
        <KpiMini label="Campañas activas" value="4" delta="1 nueva" positive icon={<IconCampaigns />} />
        <KpiMini label="Facturas SII" value="8 emitidas" delta="2 pend." positive={false} icon={<IconSii />} />
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-5 gap-6">

        {/* Revenue + Expenses Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="col-span-3 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
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
                  <stop offset="5%" stopColor={tokens.colors.primary[500]} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={tokens.colors.primary[500]} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gGasto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.12} />
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
              <Area type="monotone" dataKey="gasto" name="Gastos" stroke="#F59E0B" strokeWidth={2}
                fill="url(#gGasto)" dot={{ r: 3, fill: '#F59E0B' }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pipeline Evolution */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="col-span-2 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
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
      </div>

      {/* Bottom Row: Emails + Deals + SII */}
      <div className="grid grid-cols-3 gap-6">

        {/* Important Emails */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
        >
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
        </motion.div>

        {/* Recent Deals */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
        >
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
                    deal.stage === 'Cerrado' ? 'bg-green-50 text-green-700' :
                    deal.stage === 'Negociación' ? 'bg-blue-50 text-blue-700' :
                    deal.stage === 'Propuesta' ? 'bg-purple-50 text-purple-700' :
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
        </motion.div>

        {/* SII / Channel Spend */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
        >
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
        </motion.div>
      </div>

      {/* Quick SII Summary Row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <IconSii />
            </span>
            <div>
              <p className="text-sm font-bold text-neutral-800">Resumen SII — Abril 2026</p>
              <p className="text-[11px] text-neutral-400">Servicio de Impuestos Internos</p>
            </div>
          </div>
          <Link href="/dashboard/sii" className="text-[11px] font-semibold text-primary-600 hover:text-primary-700">Ir a SII</Link>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {SII_ALERTS.map((item, i) => (
            <div key={i} className="rounded-lg bg-neutral-50 p-3">
              <p className="text-[11px] text-neutral-500 mb-1">{item.label}</p>
              {item.money ? (
                <p className="text-lg font-bold text-neutral-900">
                  ${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(item.money)}
                  <span className="ml-0.5 text-[0.65em] font-normal text-neutral-400">CLP</span>
                </p>
              ) : item.date ? (
                <p className="text-lg font-bold text-neutral-900">{new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' }).format(new Date(item.date))}</p>
              ) : (
                <p className={`text-lg font-bold ${item.warn ? 'text-amber-600' : 'text-neutral-900'}`}>{item.value}</p>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
