'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { pageTransition, staggerContainer, staggerItem } from '../../../../presentation/animations/variants';
import { isDemoClient } from '../../../../lib/demoMode';
import EmptyMarketingState from '../../../../presentation/components/marketing/EmptyMarketingState';

// ---------------------------------------------------------------------------
// Types & Data
// ---------------------------------------------------------------------------

type AdStatus  = 'active' | 'paused' | 'in_review' | 'rejected';
type AdType    = 'image' | 'video' | 'carousel' | 'story';
type Channel   = 'meta' | 'tiktok' | 'google' | 'linkedin' | 'email';

interface Ad {
  id: string;
  name: string;
  campaignId: string;
  campaignName: string;
  channel: Channel;
  type: AdType;
  status: AdStatus;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  gradient: string;
}

const ADS: Ad[] = [
  { id: 'ad1',  name: 'Carrusel UDLA — Admisión 2026',        campaignId: 'cmp1', campaignName: 'Captación UDLA Q2 2026',        channel: 'meta',     type: 'carousel', status: 'active',    spend: 1480, impressions: 82000,  clicks: 2050, conversions: 41, gradient: 'from-violet-400 to-violet-600' },
  { id: 'ad2',  name: 'Video UDLA — Vida Universitaria',       campaignId: 'cmp1', campaignName: 'Captación UDLA Q2 2026',        channel: 'tiktok',   type: 'video',    status: 'active',    spend: 890,  impressions: 98400,  clicks: 2270, conversions: 48, gradient: 'from-pink-400 to-rose-600' },
  { id: 'ad3',  name: 'Imagen — Descuento matrícula 15%',      campaignId: 'cmp1', campaignName: 'Captación UDLA Q2 2026',        channel: 'meta',     type: 'image',    status: 'paused',    spend: 877,  impressions: 45600,  clicks: 1100, conversions: 18, gradient: 'from-blue-400 to-blue-600' },
  { id: 'ad4',  name: 'Carrusel Fracttal — Features CMMS',     campaignId: 'cmp2', campaignName: 'Remarketing Fracttal',          channel: 'meta',     type: 'carousel', status: 'active',    spend: 1050, impressions: 55000,  clicks: 1650, conversions: 28, gradient: 'from-emerald-400 to-teal-600' },
  { id: 'ad5',  name: 'Video Fracttal — Demo en vivo',         campaignId: 'cmp2', campaignName: 'Remarketing Fracttal',          channel: 'meta',     type: 'video',    status: 'active',    spend: 840,  impressions: 40200,  clicks: 1206, conversions: 17, gradient: 'from-cyan-400 to-cyan-600' },
  { id: 'ad6',  name: 'Search — "software CMMS Chile"',        campaignId: 'cmp3', campaignName: 'Google Search — ICI Ingeniería',channel: 'google',   type: 'image',    status: 'active',    spend: 1200, impressions: 24000,  clicks: 2160, conversions: 45, gradient: 'from-amber-400 to-orange-500' },
  { id: 'ad7',  name: 'Search — "automatización industrial"',  campaignId: 'cmp3', campaignName: 'Google Search — ICI Ingeniería',channel: 'google',   type: 'image',    status: 'active',    spend: 900,  impressions: 18000,  clicks: 1620, conversions: 27, gradient: 'from-red-400 to-red-600' },
  { id: 'ad8',  name: 'Sponsored — Suple Software',       campaignId: 'cmp4', campaignName: 'LinkedIn B2B Suple',       channel: 'linkedin', type: 'image',    status: 'paused',    spend: 1650, impressions: 28000,  clicks: 840,  conversions: 12, gradient: 'from-blue-600 to-indigo-700' },
  { id: 'ad9',  name: 'TikTok — Brand Story 30s',             campaignId: 'cmp5', campaignName: 'TikTok Brand Awareness',        channel: 'tiktok',   type: 'story',    status: 'active',    spend: 540,  impressions: 248000, clicks: 4960, conversions: 18, gradient: 'from-neutral-800 to-neutral-900' },
  { id: 'ad10', name: 'TikTok — Duet Challenge',              campaignId: 'cmp5', campaignName: 'TikTok Brand Awareness',        channel: 'tiktok',   type: 'video',    status: 'in_review', spend: 350,  impressions: 172000, clicks: 3440, conversions: 10, gradient: 'from-fuchsia-400 to-purple-600' },
];

const CHANNEL_STYLE: Record<Channel, { label: string; class: string }> = {
  meta:     { label: 'Meta',     class: 'bg-blue-100 text-blue-800' },
  tiktok:   { label: 'TikTok',   class: 'bg-neutral-900 text-white' },
  google:   { label: 'Google',   class: 'bg-red-100 text-red-700' },
  linkedin: { label: 'LinkedIn', class: 'bg-blue-700 text-white' },
  email:    { label: 'Email',    class: 'bg-purple-100 text-purple-800' },
};

const STATUS_STYLE: Record<AdStatus, { label: string; class: string }> = {
  active:    { label: 'Activo',       class: 'bg-green-50 text-green-700 border border-green-200' },
  paused:    { label: 'Pausado',      class: 'bg-amber-50 text-amber-700 border border-amber-200' },
  in_review: { label: 'En revisión',  class: 'bg-blue-50 text-blue-700 border border-blue-200' },
  rejected:  { label: 'Rechazado',    class: 'bg-red-50 text-red-700 border border-red-200' },
};

const TYPE_ICON: Record<AdType, React.ReactNode> = {
  image:    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="1" y="1" width="12" height="12" rx="1.5"/><circle cx="5" cy="5" r="1.5"/><path d="M1 9.5l4-3 3 3 2-2 3 2.5"/></svg>,
  video:    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="1" y="2" width="9" height="10" rx="1.5"/><path d="M10 5l3-2v8l-3-2V5z"/></svg>,
  carousel: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="2.5" y="2" width="9" height="10" rx="1"/><rect x="0.5" y="3.5" width="2" height="7" rx="0.5"/><rect x="11.5" y="3.5" width="2" height="7" rx="0.5"/></svg>,
  story:    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="4" y="1" width="6" height="12" rx="1"/></svg>,
};

const fmtM = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(0)}K` : String(n);
const ctr  = (cl: number, im: number) => im > 0 ? ((cl/im)*100).toFixed(2)+'%' : '0%';

const CAMPAIGNS_LIST = [...new Set(ADS.map(a => a.campaignId))].map(id => ({
  id, name: ADS.find(a => a.campaignId === id)!.campaignName,
}));

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdsPage() {
  const [isDemo, setIsDemo] = useState(true);
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter]     = useState<AdStatus | 'all'>('all');

  useEffect(() => { setIsDemo(isDemoClient()); }, []);

  const displayed = useMemo(() => ADS.filter(a => {
    const byCampaign = campaignFilter === 'all' || a.campaignId === campaignFilter;
    const byStatus   = statusFilter   === 'all' || a.status     === statusFilter;
    return byCampaign && byStatus;
  }), [campaignFilter, statusFilter]);

  if (!isDemo) {
    return <EmptyMarketingState title="Sin anuncios" description="Conecta al menos una plataforma de marketing para ver tus anuncios reales aquí." />;
  }

  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" className="p-6">

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <select
            value={campaignFilter}
            onChange={e => setCampaignFilter(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
          >
            <option value="all">Todas las campañas</option>
            {CAMPAIGNS_LIST.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {(['all','active','paused','in_review'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === s ? 'bg-primary-50 text-primary-700' : 'bg-white border border-neutral-200 text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              {s === 'all' ? 'Todos' : STATUS_STYLE[s as AdStatus].label}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 1v10M1 6h10"/></svg>
          Nuevo anuncio
        </button>
      </div>

      {/* Ad Cards Grid */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {displayed.map(ad => {
          const ch = CHANNEL_STYLE[ad.channel];
          const st = STATUS_STYLE[ad.status];
          return (
            <motion.div key={ad.id} variants={staggerItem}
              className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Preview thumbnail */}
              <div className={`h-28 bg-gradient-to-br ${ad.gradient} relative flex items-center justify-center`}>
                <div className="text-white/30">
                  {ad.type === 'video' || ad.type === 'story'
                    ? <svg width="36" height="36" viewBox="0 0 36 36" fill="currentColor"><path d="M10 7l20 11L10 29z"/></svg>
                    : <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="32" height="32" rx="4"/><circle cx="13" cy="13" r="4"/><path d="M2 24l10-8 8 8 6-5 8 7"/></svg>
                  }
                </div>
                {/* Type badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-black/40 backdrop-blur-sm px-2 py-1 text-[10px] font-semibold text-white">
                  {TYPE_ICON[ad.type]}
                  <span className="ml-1 capitalize">{ad.type === 'carousel' ? 'Carrusel' : ad.type === 'video' ? 'Video' : ad.type === 'story' ? 'Story' : 'Imagen'}</span>
                </div>
                {/* Channel badge */}
                <span className={`absolute top-2 right-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${ch.class}`}>
                  {ch.label}
                </span>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-neutral-900 leading-snug line-clamp-2">{ad.name}</p>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.class}`}>
                    {st.label}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 truncate mb-3">{ad.campaignName}</p>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 border-t border-neutral-100 pt-3">
                  <div>
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Impr.</p>
                    <p className="text-xs font-bold text-neutral-800 mt-0.5">{fmtM(ad.impressions)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider">CTR</p>
                    <p className="text-xs font-bold text-neutral-800 mt-0.5">{ctr(ad.clicks, ad.impressions)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Conv.</p>
                    <p className="text-xs font-bold text-neutral-800 mt-0.5">{ad.conversions}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-neutral-100">
                  <button title="Pausar / Activar" className="flex-1 rounded-lg border border-neutral-200 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 transition-colors font-medium">
                    {ad.status === 'active' ? 'Pausar' : 'Activar'}
                  </button>
                  <button title="Duplicar" className="rounded-lg border border-neutral-200 p-1.5 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="1" y="4" width="9" height="9" rx="1.5"/><path d="M4 4V2.5A1.5 1.5 0 0 1 5.5 1H11.5A1.5 1.5 0 0 1 13 2.5V8.5A1.5 1.5 0 0 1 11.5 10H10"/></svg>
                  </button>
                  <button title="Editar" className="rounded-lg border border-neutral-200 p-1.5 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"/></svg>
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
