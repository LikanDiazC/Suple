'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { pageTransition } from '../../../presentation/animations/variants';
import { useCurrency, type Currency } from '../../../application/context/currency/CurrencyContext';

// ---------------------------------------------------------------------------
// Currency options
// ---------------------------------------------------------------------------

const CURRENCY_OPTIONS: { key: Currency; label: string; symbol: string; desc: string; example: string; flag: string }[] = [
  {
    key: 'CLP',
    label: 'Peso Chileno',
    symbol: '$',
    desc: 'Formato: $1.234.567',
    example: '$12.500.000',
    flag: 'CL',
  },
  {
    key: 'USD',
    label: 'Dólar Estadounidense',
    symbol: 'US$',
    desc: 'Formato: US$1,234,567',
    example: 'US$12,500,000',
    flag: 'US',
  },
  {
    key: 'EUR',
    label: 'Euro',
    symbol: '\u20AC',
    desc: 'Formato: \u20AC1.234.567',
    example: '\u20AC12.500.000',
    flag: 'EU',
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const { currency, setCurrency } = useCurrency();

  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" className="p-6 max-w-3xl">

      {/* Section: Currency */}
      <section className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 rounded-lg bg-primary-50 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-600">
              <circle cx="9" cy="9" r="7" />
              <path d="M6.5 7.5c0-.8.7-1.5 2-1.5s2.5.8 2.5 1.8c0 1.2-1.5 1.2-1.5 2.2M9 13h.01" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Moneda</h2>
            <p className="text-xs text-neutral-500">Selecciona la moneda para mostrar valores monetarios en la plataforma</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {CURRENCY_OPTIONS.map(opt => {
            const selected = currency === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setCurrency(opt.key)}
                className={`relative rounded-xl border-2 p-5 text-left transition-all ${
                  selected
                    ? 'border-primary-500 bg-primary-50 shadow-sm'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white'
                }`}
              >
                {/* Selected check */}
                {selected && (
                  <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary-500 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.5"><path d="M2 5l2.5 2.5L8 3"/></svg>
                  </div>
                )}

                {/* Flag + symbol */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg font-bold text-neutral-900">{opt.symbol}</span>
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-500">{opt.key}</span>
                </div>

                <p className={`text-sm font-semibold mb-1 ${selected ? 'text-primary-700' : 'text-neutral-800'}`}>
                  {opt.label}
                </p>
                <p className="text-[11px] text-neutral-400 mb-3">{opt.desc}</p>

                {/* Preview */}
                <div className="rounded-lg bg-neutral-50 border border-neutral-100 px-3 py-2">
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">Vista previa</p>
                  <p className="text-sm font-bold text-neutral-800">
                    {opt.example}
                    <span className="ml-0.5 text-[10px] font-normal text-neutral-400">{opt.key}</span>
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#2563eb" strokeWidth="1.3" className="shrink-0 mt-0.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 6.5v4M7 5h.01"/></svg>
          <p className="text-[11px] text-blue-700 leading-relaxed">
            El cambio de moneda afecta solo la visualización. Los datos del módulo SII siempre se muestran en CLP (pesos chilenos) por normativa tributaria.
          </p>
        </div>
      </section>

      {/* Section: Display preferences */}
      <section className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-600">
              <circle cx="9" cy="9" r="2.5" /><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.4 3.4l1.4 1.4M13.2 13.2l1.4 1.4M3.4 14.6l1.4-1.4M13.2 4.8l1.4-1.4" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Idioma y zona horaria</h2>
            <p className="text-xs text-neutral-500">Preferencias regionales de la plataforma</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Idioma</label>
            <select className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100" defaultValue="es">
              <option value="es">Español (Chile)</option>
              <option value="en">English (US)</option>
              <option value="pt">Português (BR)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Zona horaria</label>
            <select className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100" defaultValue="clst">
              <option value="clst">America/Santiago (CLT, UTC-3)</option>
              <option value="utc">UTC</option>
              <option value="est">America/New_York (EST, UTC-5)</option>
              <option value="cet">Europe/Madrid (CET, UTC+1)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Section: Notifications */}
      <section className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-600">
              <path d="M4.5 7a4.5 4.5 0 0 1 9 0c0 4.5 2 5.5 2 5.5H2.5s2-1 2-5.5" />
              <path d="M7.5 14.5a2 2 0 0 0 3 0" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Notificaciones</h2>
            <p className="text-xs text-neutral-500">Configura las alertas que recibes</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Nuevos leads CRM', desc: 'Cuando se crea un contacto o empresa', default: true },
            { label: 'Deals cerrados', desc: 'Cuando un deal cambia a Cerrado Ganado/Perdido', default: true },
            { label: 'Campañas pausadas', desc: 'Cuando una campaña se pausa automáticamente', default: false },
            { label: 'Alertas SII', desc: 'Facturas rechazadas o con reparos', default: true },
          ].map(item => (
            <label key={item.label} className="flex items-center justify-between rounded-lg border border-neutral-100 px-4 py-3 hover:bg-neutral-50 transition-colors cursor-pointer">
              <div>
                <p className="text-sm font-medium text-neutral-800">{item.label}</p>
                <p className="text-[11px] text-neutral-400">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                defaultChecked={item.default}
                className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-200"
              />
            </label>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
