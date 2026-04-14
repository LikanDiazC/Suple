'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { pageTransition, staggerContainer, staggerItem } from '../../../../presentation/animations/variants';
import { useCurrency } from '../../../../application/context/currency/CurrencyContext';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type Attribution = 'last_click' | 'first_click' | 'linear' | 'time_decay' | 'data_driven';

const ATTRIBUTION_MODELS: { key: Attribution; label: string; desc: string }[] = [
  { key: 'last_click',   label: 'Último clic',          desc: '100% al canal de conversión final' },
  { key: 'first_click',  label: 'Primer clic',           desc: '100% al canal de primer contacto' },
  { key: 'linear',       label: 'Lineal',                desc: 'Crédito igual a todos los canales' },
  { key: 'time_decay',   label: 'Decaimiento temporal',  desc: 'Mayor crédito a interacciones recientes' },
  { key: 'data_driven',  label: 'Basado en datos',       desc: 'IA asigna crédito según impacto real' },
];

const CHANNEL_PERF: Record<Attribution, { channel: string; conversions: number; spend: number; color: string }[]> = {
  last_click:  [
    { channel: 'Google Ads',  conversions: 144, spend: 2100, color: 'bg-red-400' },
    { channel: 'Meta Ads',    conversions: 98,  spend: 5137, color: 'bg-blue-400' },
    { channel: 'TikTok Ads',  conversions: 56,  spend: 890,  color: 'bg-neutral-800' },
    { channel: 'Email',       conversions: 85,  spend: 500,  color: 'bg-purple-400' },
    { channel: 'LinkedIn Ads',conversions: 12,  spend: 1650, color: 'bg-blue-600' },
  ],
  first_click: [
    { channel: 'Meta Ads',    conversions: 152, spend: 5137, color: 'bg-blue-400' },
    { channel: 'TikTok Ads',  conversions: 98,  spend: 890,  color: 'bg-neutral-800' },
    { channel: 'Google Ads',  conversions: 62,  spend: 2100, color: 'bg-red-400' },
    { channel: 'Email',       conversions: 41,  spend: 500,  color: 'bg-purple-400' },
    { channel: 'LinkedIn Ads',conversions: 23,  spend: 1650, color: 'bg-blue-600' },
  ],
  linear: [
    { channel: 'Meta Ads',    conversions: 112, spend: 5137, color: 'bg-blue-400' },
    { channel: 'Google Ads',  conversions: 98,  spend: 2100, color: 'bg-red-400' },
    { channel: 'Email',       conversions: 67,  spend: 500,  color: 'bg-purple-400' },
    { channel: 'TikTok Ads',  conversions: 71,  spend: 890,  color: 'bg-neutral-800' },
    { channel: 'LinkedIn Ads',conversions: 27,  spend: 1650, color: 'bg-blue-600' },
  ],
  time_decay: [
    { channel: 'Google Ads',  conversions: 128, spend: 2100, color: 'bg-red-400' },
    { channel: 'Meta Ads',    conversions: 118, spend: 5137, color: 'bg-blue-400' },
    { channel: 'Email',       conversions: 72,  spend: 500,  color: 'bg-purple-400' },
    { channel: 'TikTok Ads',  conversions: 48,  spend: 890,  color: 'bg-neutral-800' },
    { channel: 'LinkedIn Ads',conversions: 9,   spend: 1650, color: 'bg-blue-600' },
  ],
  data_driven: [
    { channel: 'Meta Ads',    conversions: 126, spend: 5137, color: 'bg-blue-400' },
    { channel: 'Google Ads',  conversions: 109, spend: 2100, color: 'bg-red-400' },
    { channel: 'TikTok Ads',  conversions: 68,  spend: 890,  color: 'bg-neutral-800' },
    { channel: 'Email',       conversions: 63,  spend: 500,  color: 'bg-purple-400' },
    { channel: 'LinkedIn Ads',conversions: 14,  spend: 1650, color: 'bg-blue-600' },
  ],
};

const FUNNEL = [
  { label: 'Impresiones',   value: 774100, pct: 100 },
  { label: 'Clics',         value: 21046,  pct: 2.72 },
  { label: 'Leads',         value: 1240,   pct: 5.89 },
  { label: 'Oportunidades', value: 395,    pct: 31.85 },
  { label: 'Ventas',        value: 89,     pct: 22.53 },
];

const PLATFORMS = [
  { name: 'Meta CAPI',        status: 'connected', color: 'text-green-600', dot: 'bg-green-500', detail: 'Events API v16 · Cobertura 94%' },
  { name: 'TikTok Events API',status: 'connected', color: 'text-green-600', dot: 'bg-green-500', detail: 'Web Events · Cobertura 89%' },
  { name: 'Google Tag Manager',status: 'connected', color: 'text-green-600', dot: 'bg-green-500', detail: 'GTM-XXXXX · Enhanced Conv.' },
  { name: 'LinkedIn Insight',  status: 'connected', color: 'text-green-600', dot: 'bg-green-500', detail: 'Insight Tag · Cobertura 76%' },
  { name: 'Klaviyo (Email)',   status: 'pending',   color: 'text-amber-600', dot: 'bg-amber-400', detail: 'Pendiente configuración' },
];

const DATE_RANGES = ['Hoy', '7 días', '30 días', '90 días'];

const fmtM = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}K` : String(n);
const fmtN = (n: number) => new Intl.NumberFormat('es-CL').format(n);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const { fmt: fmtMoney, code: currCode } = useCurrency();
  const [attribution, setAttribution] = useState<Attribution>('data_driven');
  const [dateRange, setDateRange]     = useState('30 días');

  const channels = CHANNEL_PERF[attribution];
  const maxConv  = Math.max(...channels.map(c => c.conversions));

  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" className="p-6 space-y-6">

      {/* Date range + info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Atribución & Performance</h2>
          <p className="text-sm text-neutral-500">Analiza el impacto real de cada canal en tus conversiones</p>
        </div>
        <div className="flex items-center gap-1 bg-white rounded-lg border border-neutral-200 p-1">
          {DATE_RANGES.map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                dateRange === r ? 'bg-primary-500 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Attribution Model Selector */}
      <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-4">Modelo de atribución</p>
        <div className="grid grid-cols-5 gap-3">
          {ATTRIBUTION_MODELS.map(m => (
            <button
              key={m.key}
              onClick={() => setAttribution(m.key)}
              className={`rounded-xl border-2 p-3 text-left transition-all ${
                attribution === m.key
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-100 hover:border-neutral-300 bg-white'
              }`}
            >
              <p className={`text-sm font-semibold mb-1 ${attribution === m.key ? 'text-primary-700' : 'text-neutral-800'}`}>
                {m.label}
              </p>
              <p className="text-[11px] text-neutral-400 leading-snug">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* Channel Performance Bar Chart */}
        <div className="col-span-2 bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
          <p className="text-sm font-bold text-neutral-800 mb-6">Conversiones por canal — <span className="text-neutral-400 font-normal">{ATTRIBUTION_MODELS.find(m=>m.key===attribution)?.label}</span></p>
          <div className="space-y-4">
            {channels.map(ch => {
              const barW = maxConv > 0 ? (ch.conversions / maxConv) * 100 : 0;
              const cpa  = ch.conversions > 0 ? fmtMoney(Math.round(ch.spend / ch.conversions)) : '—';
              return (
                <div key={ch.channel}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-neutral-700">{ch.channel}</span>
                    <div className="flex items-center gap-4 text-neutral-500">
                      <span>{ch.conversions} conv.</span>
                      <span className="font-semibold text-neutral-800">{cpa} <span className="text-[10px] font-normal text-neutral-400">{currCode}</span> CPA</span>
                    </div>
                  </div>
                  <div className="h-6 w-full rounded-full bg-neutral-100 overflow-hidden">
                    <motion.div
                      key={`${attribution}-${ch.channel}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${barW}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-full rounded-full ${ch.color} flex items-center px-2`}
                    >
                      {barW > 15 && <span className="text-[10px] font-bold text-white">{ch.conversions}</span>}
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
          <p className="text-sm font-bold text-neutral-800 mb-6">Embudo de conversión</p>
          <div className="space-y-1">
            {FUNNEL.map((step, i) => {
              const w = 100 - i * 14;
              return (
                <div key={step.label}>
                  <div
                    className="mx-auto rounded-sm bg-primary-500 flex items-center justify-center transition-all"
                    style={{ width: `${w}%`, height: 36, opacity: 1 - i * 0.12 }}
                  >
                    <span className="text-[10px] font-bold text-white truncate px-2">{fmtM(step.value)}</span>
                  </div>
                  <p className="text-center text-[10px] text-neutral-400 mt-1 mb-2">
                    {step.label}
                    {i > 0 && <span className="text-neutral-300 ml-1">({step.pct.toFixed(1)}% conv.)</span>}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Platform Connection Status */}
      <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-bold text-neutral-800">Conexión de plataformas (Server-Side Tracking)</p>
          <button className="text-xs font-semibold text-primary-600 hover:text-primary-700">+ Conectar plataforma</button>
        </div>
        <motion.div variants={staggerContainer} initial="initial" animate="animate"
          className="grid grid-cols-5 gap-4"
        >
          {PLATFORMS.map(p => (
            <motion.div key={p.name} variants={staggerItem}
              className="rounded-xl border border-neutral-100 p-4 hover:border-neutral-200 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                <span className={`text-xs font-semibold ${p.color}`}>
                  {p.status === 'connected' ? 'Conectado' : 'Pendiente'}
                </span>
              </div>
              <p className="text-sm font-bold text-neutral-900 mb-1">{p.name}</p>
              <p className="text-[11px] text-neutral-400">{p.detail}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
