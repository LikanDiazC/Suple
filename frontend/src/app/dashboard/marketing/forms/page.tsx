'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { pageTransition, staggerContainer, staggerItem } from '../../../../presentation/animations/variants';
import { isDemoClient } from '../../../../lib/demoMode';
import EmptyMarketingState from '../../../../presentation/components/marketing/EmptyMarketingState';

// ---------------------------------------------------------------------------
// Types & Data
// ---------------------------------------------------------------------------

type FormStatus = 'published' | 'draft' | 'paused';

interface CaptureForm {
  id: string;
  name: string;
  description: string;
  status: FormStatus;
  leads: number;
  views: number;
  convRate: number;
  fields: string[];
  connectedCampaigns: string[];
  createdAt: string;
  embedUrl: string;
}

const STATUS_STYLE: Record<FormStatus, { label: string; class: string; dot: string }> = {
  published: { label: 'Publicado', class: 'bg-green-50 text-green-700 border-green-200',  dot: 'bg-green-500' },
  draft:     { label: 'Borrador',  class: 'bg-neutral-100 text-neutral-600 border-neutral-200', dot: 'bg-neutral-400' },
  paused:    { label: 'Pausado',   class: 'bg-amber-50 text-amber-700 border-amber-200',  dot: 'bg-amber-400' },
};

const FORMS: CaptureForm[] = [
  {
    id: 'f1',
    name: 'Demo Request — Suple',
    description: 'Solicitud de demo para prospectos B2B interesados en el plan Suple.',
    status: 'published',
    leads: 124, views: 674, convRate: 18.4,
    fields: ['Nombre', 'Empresa', 'Correo', 'Teléfono', 'N° empleados'],
    connectedCampaigns: ['LinkedIn B2B Suple', 'Google Search — ICI Ingeniería'],
    createdAt: '2026-03-01',
    embedUrl: 'https://forms.empresa.com/demo-enterprise',
  },
  {
    id: 'f2',
    name: 'Registro Webinar — Q2 2026',
    description: 'Formulario de inscripción para el webinar "Automatización de Marketing con IA".',
    status: 'published',
    leads: 89, views: 277, convRate: 32.1,
    fields: ['Nombre', 'Correo', 'Empresa', 'Cargo'],
    connectedCampaigns: ['Email Newsletter — Abril 2026'],
    createdAt: '2026-04-01',
    embedUrl: 'https://forms.empresa.com/webinar-q2',
  },
  {
    id: 'f3',
    name: 'Descarga Whitepaper — CRM Guide',
    description: 'Lead magnet para descargar la guía "CRM para empresas B2B en Chile 2026".',
    status: 'published',
    leads: 203, views: 1586, convRate: 12.8,
    fields: ['Nombre', 'Correo', 'Industria'],
    connectedCampaigns: ['Captación UDLA Q2 2026', 'Remarketing Fracttal'],
    createdAt: '2026-03-15',
    embedUrl: 'https://forms.empresa.com/whitepaper-crm',
  },
  {
    id: 'f4',
    name: 'Cotización Rápida',
    description: 'Formulario para solicitar una cotización personalizada en menos de 2 minutos.',
    status: 'published',
    leads: 67, views: 817, convRate: 8.2,
    fields: ['Nombre', 'Correo', 'Empresa', 'Producto de interés', 'Presupuesto estimado', 'Mensaje'],
    connectedCampaigns: ['Google Search — ICI Ingeniería', 'TikTok Brand Awareness'],
    createdAt: '2026-03-20',
    embedUrl: 'https://forms.empresa.com/cotizacion',
  },
  {
    id: 'f5',
    name: 'Newsletter Subscription',
    description: 'Suscripción al newsletter mensual con contenido de marketing y tecnología.',
    status: 'paused',
    leads: 312, views: 4200, convRate: 7.4,
    fields: ['Nombre', 'Correo'],
    connectedCampaigns: ['Email Newsletter — Abril 2026'],
    createdAt: '2026-01-10',
    embedUrl: 'https://forms.empresa.com/newsletter',
  },
  {
    id: 'f6',
    name: 'Prueba gratuita — 14 días',
    description: 'Trial gratuito de la plataforma Suple SaaS por 14 días sin tarjeta.',
    status: 'draft',
    leads: 0, views: 0, convRate: 0,
    fields: ['Nombre', 'Correo empresarial', 'Empresa', 'País', 'Tamaño equipo'],
    connectedCampaigns: [],
    createdAt: '2026-04-10',
    embedUrl: 'https://forms.empresa.com/trial',
  },
];

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-CL', { day:'numeric', month:'short', year:'numeric' });
const fmtN   = (n: number)   => new Intl.NumberFormat('es-CL').format(n);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FormsPage() {
  const [isDemo, setIsDemo] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FormStatus | 'all'>('all');
  const [embedFormId, setEmbedFormId]   = useState<string | null>(null);

  useEffect(() => { setIsDemo(isDemoClient()); }, []);

  if (!isDemo) {
    return <EmptyMarketingState title="Sin formularios" description="Conecta al menos una plataforma de marketing para ver tus formularios de captura de leads." />;
  }

  const displayed = statusFilter === 'all' ? FORMS : FORMS.filter(f => f.status === statusFilter);
  const embedForm = FORMS.find(f => f.id === embedFormId);

  const totalLeads = FORMS.reduce((s, f) => s + f.leads, 0);
  const totalViews = FORMS.reduce((s, f) => s + f.views, 0);
  const avgConv    = totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(1) : '0';

  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" className="p-6">

      {/* Summary bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total leads capturados', value: fmtN(totalLeads) },
          { label: 'Total vistas',            value: fmtN(totalViews) },
          { label: 'Conv. promedio',           value: `${avgConv}%`   },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-neutral-100 shadow-sm px-5 py-4">
            <p className="text-xs text-neutral-400 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-neutral-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {(['all','published','paused','draft'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? 'bg-primary-50 text-primary-700'
                  : 'bg-white border border-neutral-200 text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              {s === 'all' ? 'Todos' : STATUS_STYLE[s].label}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 1v10M1 6h10"/></svg>
          Nuevo formulario
        </button>
      </div>

      {/* Forms Grid */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate"
        className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5"
      >
        {displayed.map(form => {
          const st = STATUS_STYLE[form.status];
          return (
            <motion.div key={form.id} variants={staggerItem}
              className="bg-white rounded-xl border border-neutral-100 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="text-sm font-bold text-neutral-900 leading-snug">{form.name}</p>
                <span className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${st.class}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                  {st.label}
                </span>
              </div>
              <p className="text-[12px] text-neutral-500 mb-4 leading-relaxed">{form.description}</p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-neutral-50 rounded-lg">
                <div className="text-center">
                  <p className="text-lg font-bold text-neutral-900">{fmtN(form.leads)}</p>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Leads</p>
                </div>
                <div className="text-center border-x border-neutral-200">
                  <p className="text-lg font-bold text-neutral-900">{fmtN(form.views)}</p>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Vistas</p>
                </div>
                <div className="text-center">
                  <p className={`text-lg font-bold ${form.convRate > 20 ? 'text-green-600' : form.convRate > 10 ? 'text-primary-600' : 'text-neutral-700'}`}>
                    {form.convRate}%
                  </p>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Conv.</p>
                </div>
              </div>

              {/* Fields */}
              <div className="mb-4">
                <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1.5">Campos</p>
                <div className="flex flex-wrap gap-1">
                  {form.fields.map(f => (
                    <span key={f} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">{f}</span>
                  ))}
                </div>
              </div>

              {/* Connected campaigns */}
              {form.connectedCampaigns.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1.5">Campañas conectadas</p>
                  <div className="space-y-0.5">
                    {form.connectedCampaigns.map(c => (
                      <p key={c} className="text-[11px] text-primary-600 truncate">· {c}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-auto flex items-center justify-between border-t border-neutral-100 pt-3">
                <span className="text-[10px] text-neutral-400">Creado {fmtDate(form.createdAt)}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEmbedFormId(form.id)}
                    className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
                  >
                    {'</>'}  Código
                  </button>
                  <button className="rounded-lg border border-neutral-200 p-1.5 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 transition-colors">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M8.5 2.5l2 2L3 12H1v-2L8.5 2.5z"/></svg>
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Embed code modal */}
      {embedForm && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6"
          onClick={() => setEmbedFormId(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-neutral-900">Código de incrustación — {embedForm.name}</h3>
              <button onClick={() => setEmbedFormId(null)} className="text-neutral-400 hover:text-neutral-600">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3l10 10M13 3L3 13"/></svg>
              </button>
            </div>
            <p className="text-xs text-neutral-500 mb-3">Copia este código e incrústalo en cualquier página de tu sitio web.</p>
            <pre className="bg-neutral-900 text-green-400 text-[11px] rounded-lg p-4 overflow-x-auto font-mono leading-relaxed">
{`<!-- Suple Forms — ${embedForm.name} -->
<script src="https://forms.empresa.com/embed.js"
  data-form-id="${embedForm.id}"
  data-form-url="${embedForm.embedUrl}"
  data-theme="light"
  data-lang="es">
</script>`}
            </pre>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => navigator.clipboard?.writeText(`<script src="https://forms.empresa.com/embed.js" data-form-id="${embedForm.id}" data-theme="light" data-lang="es"></script>`).catch(() => {})}
                className="flex-1 rounded-lg bg-primary-500 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
              >
                Copiar código
              </button>
              <button onClick={() => setEmbedFormId(null)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50">
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
