'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { pageTransition, staggerContainer, staggerItem } from '../../../../presentation/animations/variants';
import { useCurrency } from '../../../../application/context/currency/CurrencyContext';

// ---------------------------------------------------------------------------
// Types & Data
// ---------------------------------------------------------------------------

type Status  = 'active' | 'paused' | 'completed' | 'draft';
type Channel = 'meta' | 'tiktok' | 'google' | 'linkedin' | 'email';

interface Campaign {
  id: string;
  name: string;
  channels: Channel[];
  status: Status;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpa: number;
  startDate: string;
  endDate: string;
}

const CAMPAIGNS: Campaign[] = [
  { id: 'cmp1', name: 'Captación UDLA Q2 2026',          channels: ['meta','tiktok'],  status: 'active',    budget: 5000,  spend: 3247, impressions: 180400, clicks: 4320, conversions: 89, cpa: 36.48, startDate: '2026-04-01', endDate: '2026-06-30' },
  { id: 'cmp2', name: 'Remarketing Fracttal',             channels: ['meta'],           status: 'active',    budget: 2000,  spend: 1890, impressions: 95200,  clicks: 2856, conversions: 45, cpa: 42.00, startDate: '2026-03-15', endDate: '2026-05-15' },
  { id: 'cmp3', name: 'Google Search — ICI Ingeniería',   channels: ['google'],         status: 'active',    budget: 3500,  spend: 2100, impressions: 42000,  clicks: 3780, conversions: 72, cpa: 29.17, startDate: '2026-04-01', endDate: '2026-05-31' },
  { id: 'cmp4', name: 'LinkedIn B2B Enterprise',          channels: ['linkedin'],       status: 'paused',    budget: 4000,  spend: 1650, impressions: 28000,  clicks: 840,  conversions: 12, cpa: 137.5, startDate: '2026-03-01', endDate: '2026-06-30' },
  { id: 'cmp5', name: 'TikTok Brand Awareness',           channels: ['tiktok'],         status: 'active',    budget: 1500,  spend: 890,  impressions: 420000, clicks: 8400, conversions: 28, cpa: 31.79, startDate: '2026-04-10', endDate: '2026-05-10' },
  { id: 'cmp6', name: 'Email Newsletter — Abril 2026',    channels: ['email'],          status: 'completed', budget: 500,   spend: 500,  impressions: 8500,   clicks: 850,  conversions: 85, cpa: 5.88,  startDate: '2026-04-01', endDate: '2026-04-30' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHANNEL_STYLE: Record<Channel, { label: string; className: string }> = {
  meta:     { label: 'Meta',     className: 'bg-blue-100 text-blue-800' },
  tiktok:   { label: 'TikTok',   className: 'bg-neutral-900 text-white' },
  google:   { label: 'Google',   className: 'bg-red-100 text-red-700' },
  linkedin: { label: 'LinkedIn', className: 'bg-blue-700 text-white' },
  email:    { label: 'Email',    className: 'bg-purple-100 text-purple-800' },
};

const STATUS_STYLE: Record<Status, { label: string; className: string; dot: string }> = {
  active:    { label: 'Activo',     className: 'bg-green-50 text-green-700 border-green-200',  dot: 'bg-green-500' },
  paused:    { label: 'Pausado',    className: 'bg-amber-50 text-amber-700 border-amber-200',  dot: 'bg-amber-400' },
  completed: { label: 'Completado', className: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
  draft:     { label: 'Borrador',   className: 'bg-neutral-100 text-neutral-600 border-neutral-200', dot: 'bg-neutral-400' },
};

const fmt  = (n: number) => new Intl.NumberFormat('es-CL').format(n);
const fmtM = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(0)}K` : String(n);
// fmtUSD replaced by useCurrency() hook — see component
const ctr = (clicks: number, impressions: number) => impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) + '%' : '0%';

const TABS: { key: Status | 'all'; label: string }[] = [
  { key: 'all',       label: 'Todos' },
  { key: 'active',    label: 'Activos' },
  { key: 'paused',    label: 'Pausados' },
  { key: 'completed', label: 'Completados' },
  { key: 'draft',     label: 'Borradores' },
];

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

interface KpiCardProps {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  sub?: string;
}

function KpiCard({ label, value, delta, positive, sub }: KpiCardProps) {
  return (
    <motion.div variants={staggerItem} className="bg-white rounded-xl border border-neutral-100 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">{label}</p>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
      {sub && <p className="text-[11px] text-neutral-400 mt-0.5">{sub}</p>}
      <p className={`text-xs font-semibold mt-2 ${positive ? 'text-green-600' : 'text-red-500'}`}>
        {positive ? '↑' : '↓'} {delta} <span className="font-normal text-neutral-400">vs mes anterior</span>
      </p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CampaignsPage() {
  const { fmt: fmtUSD, code: currCode } = useCurrency();
  const [activeTab, setActiveTab] = useState<Status | 'all'>('all');
  const [search, setSearch]       = useState('');
  const [sortField, setSortField] = useState<keyof Campaign>('spend');
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc');

  const displayed = useMemo(() => {
    let list = activeTab === 'all' ? CAMPAIGNS : CAMPAIGNS.filter(c => c.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const av = a[sortField] as number | string;
      const bv = b[sortField] as number | string;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'desc' ? bv - av : av - bv;
      }
      return sortDir === 'desc'
        ? String(bv).localeCompare(String(av))
        : String(av).localeCompare(String(bv));
    });
  }, [activeTab, search, sortField, sortDir]);

  const tabCount = (key: Status | 'all') =>
    key === 'all' ? CAMPAIGNS.length : CAMPAIGNS.filter(c => c.status === key).length;

  const totalSpend       = CAMPAIGNS.reduce((s, c) => s + c.spend, 0);
  const totalImpressions = CAMPAIGNS.reduce((s, c) => s + c.impressions, 0);
  const totalClicks      = CAMPAIGNS.reduce((s, c) => s + c.clicks, 0);
  const totalConversions = CAMPAIGNS.reduce((s, c) => s + c.conversions, 0);
  const avgCtr           = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) + '%' : '0%';
  const roas             = 4.2;

  const handleSort = (field: keyof Campaign) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: keyof Campaign }) => (
    <span className="ml-1 text-neutral-300">
      {sortField === field ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
    </span>
  );

  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" className="p-6">

      {/* KPI Cards */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate"
        className="grid grid-cols-6 gap-4 mb-6"
      >
        <KpiCard label="Gasto Total"    value={`${fmtUSD(totalSpend)} ${currCode}`} delta="8.4%"   positive={true}  sub={`presupuesto total: ${fmtUSD(16500)} ${currCode}`} />
        <KpiCard label="Impresiones"    value={fmtM(totalImpressions)}   delta="12.1%"  positive={true}  />
        <KpiCard label="Clics"          value={fmt(totalClicks)}          delta="6.8%"   positive={true}  />
        <KpiCard label="CTR"            value={avgCtr}                    delta="0.2 pp" positive={true}  />
        <KpiCard label="Conversiones"   value={fmt(totalConversions)}     delta="15.3%"  positive={true}  />
        <KpiCard label="ROAS"           value={`${roas}×`}                delta="0.3×"   positive={true}  sub="por cada $1 invertido" />
      </motion.div>

      {/* Table container */}
      <div className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3 gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-neutral-500 hover:bg-neutral-50'
                }`}
              >
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  activeTab === tab.key ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-500'
                }`}>
                  {tabCount(tab.key)}
                </span>
              </button>
            ))}
          </div>

          {/* Right: search + new */}
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
                className="rounded-lg border border-neutral-200 bg-neutral-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary-400 focus:bg-white transition-colors w-44"
              />
            </div>
            <button className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600 transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 1v10M1 6h10"/></svg>
              Nueva campaña
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                {[
                  { label: 'Campaña',     field: 'name'        as keyof Campaign },
                  { label: 'Estado',      field: 'status'      as keyof Campaign },
                  { label: 'Presupuesto', field: 'budget'      as keyof Campaign },
                  { label: 'Impresiones', field: 'impressions' as keyof Campaign },
                  { label: 'CTR',         field: 'clicks'      as keyof Campaign },
                  { label: 'Conversiones',field: 'conversions' as keyof Campaign },
                  { label: 'CPA',         field: 'cpa'         as keyof Campaign },
                ].map(col => (
                  <th
                    key={col.field}
                    onClick={() => handleSort(col.field)}
                    className="cursor-pointer px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-600 select-none"
                  >
                    {col.label}<SortIcon field={col.field} />
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-neutral-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((c, i) => {
                const spendPct = Math.min((c.spend / c.budget) * 100, 100);
                const ss = STATUS_STYLE[c.status];
                return (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors"
                  >
                    {/* Name + channels */}
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-neutral-900 mb-1.5">{c.name}</p>
                      <div className="flex gap-1 flex-wrap">
                        {c.channels.map(ch => (
                          <span key={ch} className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${CHANNEL_STYLE[ch].className}`}>
                            {CHANNEL_STYLE[ch].label}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${ss.className}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${ss.dot}`} />
                        {ss.label}
                      </span>
                    </td>

                    {/* Budget + spend bar */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-neutral-800">{fmtUSD(c.spend)} <span className="text-[10px] font-normal text-neutral-400">{currCode}</span></span>
                        <span className="text-neutral-400">/ {fmtUSD(c.budget)}</span>
                      </div>
                      <div className="h-1.5 w-28 rounded-full bg-neutral-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${spendPct > 90 ? 'bg-red-400' : spendPct > 70 ? 'bg-amber-400' : 'bg-primary-500'}`}
                          style={{ width: `${spendPct}%` }}
                        />
                      </div>
                    </td>

                    {/* Impressions */}
                    <td className="px-4 py-3.5 text-sm text-neutral-700">{fmtM(c.impressions)}</td>

                    {/* CTR */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-semibold text-neutral-800">{ctr(c.clicks, c.impressions)}</span>
                      <p className="text-[10px] text-neutral-400">{fmt(c.clicks)} clics</p>
                    </td>

                    {/* Conversions */}
                    <td className="px-4 py-3.5 text-sm font-semibold text-neutral-800">{fmt(c.conversions)}</td>

                    {/* CPA */}
                    <td className="px-4 py-3.5 text-sm text-neutral-700">${c.cpa.toFixed(2)}</td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button title="Pausar / Reanudar" className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors">
                          {c.status === 'active'
                            ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="2" width="2.5" height="10" rx="0.5"/><rect x="8.5" y="2" width="2.5" height="10" rx="0.5"/></svg>
                            : <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M4 2.5l8 4.5-8 4.5z"/></svg>
                          }
                        </button>
                        <Link href={`/dashboard/marketing/analytics`} title="Ver analytics" className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 10V6M6 10V3M10 10V7M13 2l-4 4-3-2-4 4"/></svg>
                        </Link>
                        <button title="Editar" className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"/></svg>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>

            {/* Totals footer */}
            <tfoot>
              <tr className="bg-neutral-50 border-t border-neutral-200">
                <td className="px-4 py-3 text-xs font-bold text-neutral-600" colSpan={2}>
                  Total — {displayed.length} campañas
                </td>
                <td className="px-4 py-3 text-xs font-bold text-neutral-800">
                  {fmtUSD(displayed.reduce((s,c) => s+c.spend,0))} / {fmtUSD(displayed.reduce((s,c) => s+c.budget,0))} <span className="text-[10px] font-normal text-neutral-400">{currCode}</span>
                </td>
                <td className="px-4 py-3 text-xs font-bold text-neutral-800">{fmtM(displayed.reduce((s,c)=>s+c.impressions,0))}</td>
                <td className="px-4 py-3 text-xs font-bold text-neutral-800">
                  {(() => {
                    const imp = displayed.reduce((s,c)=>s+c.impressions,0);
                    const clk = displayed.reduce((s,c)=>s+c.clicks,0);
                    return imp>0 ? ((clk/imp)*100).toFixed(2)+'%' : '0%';
                  })()}
                </td>
                <td className="px-4 py-3 text-xs font-bold text-neutral-800">{fmt(displayed.reduce((s,c)=>s+c.conversions,0))}</td>
                <td className="px-4 py-3 text-xs font-bold text-neutral-800">
                  ${(() => {
                    const conv = displayed.reduce((s,c)=>s+c.conversions,0);
                    const spend = displayed.reduce((s,c)=>s+c.spend,0);
                    return conv>0 ? (spend/conv).toFixed(2) : '—';
                  })()}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
