'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { pageTransition, staggerContainer, staggerItem } from '../../../../presentation/animations/variants';
import { isDemoClient } from '../../../../lib/demoMode';
import EmptyMarketingState from '../../../../presentation/components/marketing/EmptyMarketingState';

// ---------------------------------------------------------------------------
// Types & Data
// ---------------------------------------------------------------------------

type AudienceSource = 'crm' | 'pixel' | 'lookalike' | 'email' | 'custom';

interface Audience {
  id: string;
  name: string;
  description: string;
  source: AudienceSource;
  size: number;
  sizeLabel: string;
  platforms: string[];
  lastSync: string;
  matchRate?: number;
  gradient: string;
}

const SOURCE_STYLE: Record<AudienceSource, { label: string; class: string }> = {
  crm:       { label: 'CRM Filter',     class: 'bg-primary-100 text-primary-700' },
  pixel:     { label: 'Pixel Web',      class: 'bg-amber-100 text-amber-700' },
  lookalike: { label: 'Lookalike',      class: 'bg-purple-100 text-purple-700' },
  email:     { label: 'Lista Email',    class: 'bg-green-100 text-green-700' },
  custom:    { label: 'Personalizada',  class: 'bg-neutral-100 text-neutral-700' },
};

const AUDIENCES: Audience[] = [
  {
    id: 'aud1',
    name: 'Leads calientes — CRM',
    description: 'Contactos CRM con lead_status = "qualified" en los últimos 60 días',
    source: 'crm',
    size: 89,
    sizeLabel: '89 contactos',
    platforms: ['Meta', 'LinkedIn'],
    lastSync: '2026-04-13T08:00:00',
    matchRate: 72,
    gradient: 'from-primary-400 to-primary-600',
  },
  {
    id: 'aud2',
    name: 'Visitantes web — 30 días',
    description: 'Usuarios que visitaron el sitio en los últimos 30 días (Pixel Meta + TikTok)',
    source: 'pixel',
    size: 4820,
    sizeLabel: '4,820 personas',
    platforms: ['Meta', 'TikTok'],
    lastSync: '2026-04-13T10:30:00',
    matchRate: 68,
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    id: 'aud3',
    name: 'Lookalike 1% UDLA',
    description: 'Audiencia similar al 1% de los clientes actuales de UDLA en Chile',
    source: 'lookalike',
    size: 45000,
    sizeLabel: '~45K personas',
    platforms: ['Meta'],
    lastSync: '2026-04-12T20:00:00',
    matchRate: undefined,
    gradient: 'from-violet-400 to-purple-600',
  },
  {
    id: 'aud4',
    name: 'Suscriptores newsletter',
    description: 'Contactos con suscripción activa al newsletter mensual',
    source: 'email',
    size: 3240,
    sizeLabel: '3,240 contactos',
    platforms: ['Meta', 'Google'],
    lastSync: '2026-04-13T07:00:00',
    matchRate: 81,
    gradient: 'from-emerald-400 to-green-600',
  },
  {
    id: 'aud5',
    name: 'Empresas tech > $1M revenue',
    description: 'Empresas CRM con industria tech e ingresos anuales > $1M USD',
    source: 'crm',
    size: 34,
    sizeLabel: '34 empresas',
    platforms: ['LinkedIn'],
    lastSync: '2026-04-13T08:00:00',
    matchRate: 88,
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'aud6',
    name: 'Retargeting — Página de precios',
    description: 'Visitantes de /pricing en los últimos 14 días que no convirtieron',
    source: 'pixel',
    size: 892,
    sizeLabel: '892 personas',
    platforms: ['Meta', 'TikTok', 'Google'],
    lastSync: '2026-04-13T11:00:00',
    matchRate: 74,
    gradient: 'from-rose-400 to-red-600',
  },
];

const PLATFORM_COLORS: Record<string, string> = {
  'Meta':     'bg-blue-100 text-blue-800',
  'TikTok':   'bg-neutral-900 text-white',
  'Google':   'bg-red-100 text-red-700',
  'LinkedIn': 'bg-blue-700 text-white',
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-CL', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AudiencesPage() {
  const [isDemo, setIsDemo] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<AudienceSource | 'all'>('all');

  useEffect(() => { setIsDemo(isDemoClient()); }, []);

  if (!isDemo) {
    return <EmptyMarketingState title="Sin audiencias" description="Conecta al menos una plataforma de marketing para gestionar y sincronizar tus audiencias." />;
  }

  const displayed = sourceFilter === 'all'
    ? AUDIENCES
    : AUDIENCES.filter(a => a.source === sourceFilter);

  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" className="p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {(['all','crm','pixel','lookalike','email'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                sourceFilter === s
                  ? 'bg-primary-50 text-primary-700'
                  : 'bg-white border border-neutral-200 text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              {s === 'all' ? 'Todas' : SOURCE_STYLE[s].label}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 1v10M1 6h10"/></svg>
          Nueva audiencia
        </button>
      </div>

      {/* Audience Cards */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
      >
        {displayed.map(aud => (
          <motion.div key={aud.id} variants={staggerItem}
            className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Color strip */}
            <div className={`h-2 bg-gradient-to-r ${aud.gradient}`} />

            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-bold text-neutral-900 mb-1">{aud.name}</p>
                  <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${SOURCE_STYLE[aud.source].class}`}>
                    {SOURCE_STYLE[aud.source].label}
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-neutral-900">{aud.size >= 1000 ? `${(aud.size/1000).toFixed(0)}K` : aud.size}</p>
                  <p className="text-[10px] text-neutral-400">{aud.sizeLabel}</p>
                </div>
              </div>

              <p className="text-[12px] text-neutral-500 leading-relaxed mb-4">{aud.description}</p>

              {/* Match rate */}
              {aud.matchRate !== undefined && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-neutral-400">Tasa de coincidencia</span>
                    <span className="font-semibold text-neutral-700">{aud.matchRate}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${aud.matchRate}%` }} />
                  </div>
                </div>
              )}

              {/* Platforms */}
              <div className="flex items-center gap-1.5 mb-4">
                <span className="text-[10px] text-neutral-400 mr-1">Activo en:</span>
                {aud.platforms.map(p => (
                  <span key={p} className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${PLATFORM_COLORS[p] ?? 'bg-neutral-100 text-neutral-600'}`}>
                    {p}
                  </span>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                <span className="text-[10px] text-neutral-400">Sync: {fmtDate(aud.lastSync)}</span>
                <div className="flex gap-1">
                  <button className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors">
                    Sincronizar
                  </button>
                  <button className="rounded-lg border border-neutral-200 p-1.5 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 transition-colors">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M8.5 2.5l2 2L3 12H1v-2L8.5 2.5z"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
