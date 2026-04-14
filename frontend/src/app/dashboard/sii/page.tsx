'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransition, staggerContainer, staggerItem } from '../../../presentation/animations/variants';

// ---------------------------------------------------------------------------
// RUT Utilities (Mod-11 Algorithm — Chilean SII standard)
// ---------------------------------------------------------------------------

function calcDv(body: string): string {
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * mul;
    mul  = mul === 7 ? 2 : mul + 1;
  }
  const r = 11 - (sum % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}

function validateRut(raw: string): boolean {
  const cleaned = raw.replace(/[\.\-\s]/g, '').toUpperCase();
  if (cleaned.length < 2) return false;
  const body = cleaned.slice(0, -1);
  const dv   = cleaned.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  return dv === calcDv(body);
}

function formatRut(raw: string): string {
  const cleaned = raw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (!cleaned) return '';
  if (cleaned.length === 1) return cleaned;
  const body = cleaned.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${body}-${cleaned.slice(-1)}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = 'rut' | 'auth' | 'dashboard';
type AuthMethod = 'clave_unica' | 'clave_tributaria';
type FacturaTab = 'emitidas' | 'recibidas' | 'iva';

interface FacturaMock {
  folio: number;
  tipo: string;
  fecha: string;
  razonSocial: string;
  rut: string;
  montoNeto: number;
  iva: number;
  total: number;
  estado: 'ACEPTADO' | 'ACEPTADO_CON_REPAROS' | 'RECHAZADO' | 'PENDIENTE';
}

// ---------------------------------------------------------------------------
// Mock SII Data (dev mode)
// ---------------------------------------------------------------------------

const MOCK_EMITIDAS: FacturaMock[] = [
  { folio: 1001, tipo: 'Factura Afecta', fecha: '2026-04-02', razonSocial: 'UDLA Universidad', rut: '76.543.210-K', montoNeto: 2500000, iva: 475000, total: 2975000, estado: 'ACEPTADO' },
  { folio: 1002, tipo: 'Factura Afecta', fecha: '2026-04-05', razonSocial: 'Fracttal SpA', rut: '77.123.456-3', montoNeto: 1800000, iva: 342000, total: 2142000, estado: 'ACEPTADO' },
  { folio: 1003, tipo: 'Factura No Afecta', fecha: '2026-04-08', razonSocial: 'ICI Ingeniería', rut: '96.542.890-2', montoNeto: 900000, iva: 0, total: 900000, estado: 'ACEPTADO' },
  { folio: 1004, tipo: 'Factura Afecta', fecha: '2026-04-10', razonSocial: 'Sodimac S.A.', rut: '82.331.000-7', montoNeto: 3400000, iva: 646000, total: 4046000, estado: 'ACEPTADO_CON_REPAROS' },
  { folio: 1005, tipo: 'Factura Afecta', fecha: '2026-04-12', razonSocial: 'Cencosud Retail', rut: '79.221.445-1', montoNeto: 780000, iva: 148200, total: 928200, estado: 'ACEPTADO' },
  { folio: 1006, tipo: 'Factura Afecta', fecha: '2026-04-13', razonSocial: 'AVEVA Group', rut: '98.123.567-0', montoNeto: 4200000, iva: 798000, total: 4998000, estado: 'PENDIENTE' },
  { folio: 1007, tipo: 'Factura Afecta', fecha: '2026-04-13', razonSocial: 'Banco Estado', rut: '97.030.000-7', montoNeto: 1200000, iva: 228000, total: 1428000, estado: 'ACEPTADO' },
  { folio: 1008, tipo: 'Nota de Crédito', fecha: '2026-04-13', razonSocial: 'Fracttal SpA', rut: '77.123.456-3', montoNeto: -450000, iva: -85500, total: -535500, estado: 'ACEPTADO' },
];

const MOCK_RECIBIDAS: FacturaMock[] = [
  { folio: 50341, tipo: 'Factura Afecta', fecha: '2026-04-01', razonSocial: 'AWS Chile SpA', rut: '76.354.771-K', montoNeto: 1850000, iva: 351500, total: 2201500, estado: 'ACEPTADO' },
  { folio: 83920, tipo: 'Factura Afecta', fecha: '2026-04-03', razonSocial: 'Oficinas Miraflores Ltda.', rut: '78.892.003-2', montoNeto: 650000, iva: 123500, total: 773500, estado: 'ACEPTADO' },
  { folio: 12344, tipo: 'Factura Afecta', fecha: '2026-04-05', razonSocial: 'Suministros Oficina Chile', rut: '82.441.332-6', montoNeto: 280000, iva: 53200, total: 333200, estado: 'ACEPTADO' },
  { folio: 93210, tipo: 'Factura Afecta', fecha: '2026-04-07', razonSocial: 'Telefónica Chile S.A.', rut: '96.929.840-8', montoNeto: 420000, iva: 79800, total: 499800, estado: 'ACEPTADO' },
  { folio: 77001, tipo: 'Factura Afecta', fecha: '2026-04-10', razonSocial: 'Publicidad Digital SpA', rut: '76.123.890-3', montoNeto: 1200000, iva: 228000, total: 1428000, estado: 'ACEPTADO_CON_REPAROS' },
  { folio: 44561, tipo: 'Factura No Afecta', fecha: '2026-04-11', razonSocial: 'Asesoría Legal Ltda.', rut: '77.540.111-5', montoNeto: 850000, iva: 0, total: 850000, estado: 'ACEPTADO' },
  { folio: 31892, tipo: 'Factura Afecta', fecha: '2026-04-12', razonSocial: 'Proveedor Tech S.A.', rut: '96.781.230-1', montoNeto: 2100000, iva: 399000, total: 2499000, estado: 'ACEPTADO' },
  { folio: 60023, tipo: 'Factura Afecta', fecha: '2026-04-13', razonSocial: 'Capacitación Empresarial SpA', rut: '79.003.221-9', montoNeto: 350000, iva: 66500, total: 416500, estado: 'PENDIENTE' },
  { folio: 88192, tipo: 'Factura Afecta', fecha: '2026-04-13', razonSocial: 'Mantención Equipos Ltda.', rut: '76.892.001-4', montoNeto: 480000, iva: 91200, total: 571200, estado: 'ACEPTADO' },
  { folio: 10231, tipo: 'Boleta Honorarios', fecha: '2026-04-09', razonSocial: 'Juan Pérez Consultorías', rut: '15.432.876-2', montoNeto: 0, iva: 0, total: 800000, estado: 'ACEPTADO' },
  { folio: 10445, tipo: 'Boleta Honorarios', fecha: '2026-04-11', razonSocial: 'María González Diseño', rut: '17.654.321-K', montoNeto: 0, iva: 0, total: 450000, estado: 'ACEPTADO' },
];

// ---------------------------------------------------------------------------
// API ↔ Mock adapter (maps backend FacturaDto to FacturaMock for the UI)
// ---------------------------------------------------------------------------

interface FacturaApiDto {
  folio: number;
  tipoDocumento: string;
  fechaEmision: string;
  rutEmisor: string;
  razonSocialEmisor: string;
  rutReceptor: string;
  razonSocialReceptor: string;
  montoNeto: number;
  iva: number;
  montoTotal: number;
  estado: 'ACEPTADO' | 'ACEPTADO_CON_REPAROS' | 'RECHAZADO' | 'PENDIENTE';
  glosa?: string;
}

const TIPO_LABEL: Record<string, string> = {
  FACTURA_AFECTA:           'Factura Afecta',
  FACTURA_NO_AFECTA:        'Factura No Afecta',
  BOLETA_ELECTRONICA:       'Boleta Electrónica',
  BOLETA_NO_AFECTA:         'Boleta No Afecta',
  LIQUIDACION:              'Liquidación',
  FACTURA_COMPRA:           'Factura de Compra',
  NOTA_DEBITO:              'Nota de Débito',
  NOTA_CREDITO:             'Nota de Crédito',
  BOLETA_HONORARIOS:        'Boleta Honorarios',
  BOLETA_HONORARIOS_EXENTA: 'Boleta Honorarios Exenta',
};

function mapApiToMock(dto: FacturaApiDto, tipo: 'emitidas' | 'recibidas'): FacturaMock {
  return {
    folio: dto.folio,
    tipo: TIPO_LABEL[dto.tipoDocumento] ?? dto.tipoDocumento,
    fecha: dto.fechaEmision,
    // For emitidas show who you invoiced (receptor); for recibidas show who invoiced you (emisor)
    razonSocial: tipo === 'emitidas' ? dto.razonSocialReceptor : dto.razonSocialEmisor,
    rut: tipo === 'emitidas' ? dto.rutReceptor : dto.rutEmisor,
    montoNeto: dto.montoNeto,
    iva: dto.iva,
    total: dto.montoTotal,
    estado: dto.estado,
  };
}

const fmtCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(n);

// SII always uses CLP — Chilean tax law requirement
function SiiMoney({ v, className }: { v: number; className?: string }) {
  return (
    <span className={className}>
      ${fmtCLP(v)}
      <span className="ml-0.5 text-[0.65em] font-normal text-neutral-400">CLP</span>
    </span>
  );
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });

const ESTADO_STYLE = {
  ACEPTADO:              { label: 'Aceptado',            class: 'bg-green-50 text-green-700 border-green-200' },
  ACEPTADO_CON_REPAROS:  { label: 'Con reparos',         class: 'bg-amber-50 text-amber-700 border-amber-200' },
  RECHAZADO:             { label: 'Rechazado',           class: 'bg-red-50 text-red-700 border-red-200' },
  PENDIENTE:             { label: 'Pendiente',           class: 'bg-blue-50 text-blue-700 border-blue-200' },
} as const;

// IVA + PPM + Retenciones calculation (mirrors F29 logic)
const PPM_RATE = 0.01;               // 1% — Art. 84 a) LIR
const RETENCION_HONORARIOS = 0.1375; // 13.75% transitorio 2024-2028

function calcIvaResumen(emitidas: FacturaMock[], recibidas: FacturaMock[]) {
  const afectasEmitidas  = emitidas.filter(f => f.tipo === 'Factura Afecta' && f.iva > 0);
  const afectasRecibidas = recibidas.filter(f => f.tipo === 'Factura Afecta' && f.iva > 0);
  const ivaDebito  = afectasEmitidas.reduce((s, f) => s + f.iva, 0);
  const ivaCredito = afectasRecibidas.reduce((s, f) => s + f.iva, 0);
  const ventasNetas = afectasEmitidas.reduce((s, f) => s + f.montoNeto, 0);

  // PPM — Pagos Provisionales Mensuales (1% of net sales)
  const ppm = Math.round(ventasNetas * PPM_RATE);

  // Retención sobre Boletas de Honorarios recibidas (13.75%)
  const boletasHonorarios = recibidas.filter(f => f.tipo === 'Boleta Honorarios');
  const baseHonorarios = boletasHonorarios.reduce((s, f) => s + f.total, 0);
  const retencionHonorarios = Math.round(baseHonorarios * RETENCION_HONORARIOS);

  const ivaAPagar = Math.max(0, ivaDebito - ivaCredito);
  const remanente = Math.max(0, ivaCredito - ivaDebito);
  const totalAPagar = ivaAPagar + ppm + retencionHonorarios;

  return {
    ivaDebito,
    ivaCredito,
    ivaAPagar,
    remanente,
    ventasNetas,
    comprasNetas: afectasRecibidas.reduce((s, f) => s + f.montoNeto, 0),
    ppm,
    retencionHonorarios,
    baseHonorarios,
    totalAPagar,
  };
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function FacturaTable({ facturas, tipo }: { facturas: FacturaMock[]; tipo: 'emitidas' | 'recibidas' }) {
  const total = facturas.reduce((s, f) => s + f.total, 0);
  const ivaTotal = facturas.reduce((s, f) => s + f.iva, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50">
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Folio</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Tipo</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Fecha</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              {tipo === 'emitidas' ? 'Receptor' : 'Emisor'}
            </th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Neto</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-400">IVA</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Total</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Estado</th>
          </tr>
        </thead>
        <tbody>
          {facturas.map((f, i) => {
            const st = ESTADO_STYLE[f.estado];
            return (
              <motion.tr
                key={f.folio}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs text-neutral-500">#{f.folio}</td>
                <td className="px-4 py-3 text-neutral-700">{f.tipo}</td>
                <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">{fmtDate(f.fecha)}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-800">{f.razonSocial}</p>
                  <p className="text-[11px] text-neutral-400">{f.rut}</p>
                </td>
                <td className="px-4 py-3 text-right font-mono text-neutral-700 whitespace-nowrap">${fmtCLP(f.montoNeto)} <span className="text-[0.65em] font-normal text-neutral-400">CLP</span></td>
                <td className={`px-4 py-3 text-right font-mono whitespace-nowrap ${f.iva > 0 ? 'text-neutral-700' : 'text-neutral-300'}`}>${fmtCLP(f.iva)} <span className="text-[0.65em] font-normal text-neutral-400">CLP</span></td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-900 whitespace-nowrap">${fmtCLP(f.total)} <span className="text-[0.65em] font-normal text-neutral-400">CLP</span></td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${st.class}`}>
                    {st.label}
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-neutral-200 bg-neutral-50 font-semibold">
            <td colSpan={4} className="px-4 py-3 text-xs text-neutral-500">{facturas.length} documentos</td>
            <td className="px-4 py-3 text-right font-mono text-sm text-neutral-800">${fmtCLP(facturas.reduce((s, f) => s + f.montoNeto, 0))} <span className="text-[0.65em] font-normal text-neutral-400">CLP</span></td>
            <td className="px-4 py-3 text-right font-mono text-sm text-neutral-800">${fmtCLP(ivaTotal)} <span className="text-[0.65em] font-normal text-neutral-400">CLP</span></td>
            <td className="px-4 py-3 text-right font-mono text-sm font-bold text-neutral-900">${fmtCLP(total)} <span className="text-[0.65em] font-normal text-neutral-400">CLP</span></td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IVA Panel (F29 preview)
// ---------------------------------------------------------------------------

function IvaPanel({ emitidas, recibidas }: { emitidas: FacturaMock[]; recibidas: FacturaMock[] }) {
  const resumen = calcIvaResumen(emitidas, recibidas);
  const hayDeuda = resumen.ivaAPagar > 0;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.5"><rect x="3" y="2" width="14" height="16" rx="1.5"/><path d="M7 7h7M7 10h7M7 13h4"/><path d="M3 2h2v16H3"/></svg>
        </div>
        <div>
          <h2 className="text-base font-bold text-neutral-900">Formulario 29 — Abril 2026</h2>
          <p className="text-xs text-neutral-500">Vista previa de la declaración mensual de IVA</p>
        </div>
      </div>

      {/* IVA summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-neutral-100 bg-white p-5">
          <p className="text-[11px] text-neutral-400 uppercase tracking-wider mb-1">IVA Débito Fiscal</p>
          <p className="text-sm text-neutral-500 mb-3">Ventas con factura afecta</p>
          <p className="text-3xl font-bold text-neutral-900"><SiiMoney v={resumen.ivaDebito} /></p>
          <p className="text-xs text-neutral-400 mt-1">Ventas netas: <SiiMoney v={resumen.ventasNetas} /></p>
        </div>
        <div className="rounded-xl border border-neutral-100 bg-white p-5">
          <p className="text-[11px] text-neutral-400 uppercase tracking-wider mb-1">IVA Crédito Fiscal</p>
          <p className="text-sm text-neutral-500 mb-3">Compras con factura afecta</p>
          <p className="text-3xl font-bold text-neutral-900"><SiiMoney v={resumen.ivaCredito} /></p>
          <p className="text-xs text-neutral-400 mt-1">Compras netas: <SiiMoney v={resumen.comprasNetas} /></p>
        </div>
      </div>

      {/* IVA Result */}
      <div className={`rounded-xl border-2 p-6 text-center ${hayDeuda ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
        <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${hayDeuda ? 'text-red-600' : 'text-green-600'}`}>
          {hayDeuda ? 'IVA a pagar este mes' : 'Remanente credito fiscal'}
        </p>
        <p className={`text-4xl font-bold ${hayDeuda ? 'text-red-700' : 'text-green-700'}`}>
          <SiiMoney v={hayDeuda ? resumen.ivaAPagar : resumen.remanente} />
        </p>
      </div>

      {/* PPM + Retenciones cards */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="rounded-xl border border-neutral-100 bg-white p-5">
          <p className="text-[11px] text-neutral-400 uppercase tracking-wider mb-1">PPM</p>
          <p className="text-xs text-neutral-500 mb-2">1% de ventas netas (Art. 84 a LIR)</p>
          <p className="text-2xl font-bold text-neutral-900"><SiiMoney v={resumen.ppm} /></p>
        </div>
        <div className="rounded-xl border border-neutral-100 bg-white p-5">
          <p className="text-[11px] text-neutral-400 uppercase tracking-wider mb-1">Ret. Honorarios</p>
          <p className="text-xs text-neutral-500 mb-2">13,75% s/ boletas ({fmtCLP(resumen.baseHonorarios)})</p>
          <p className="text-2xl font-bold text-neutral-900"><SiiMoney v={resumen.retencionHonorarios} /></p>
        </div>
      </div>

      {/* TOTAL A PAGAR (F29 linea final) */}
      <div className="mt-4 rounded-xl border-2 border-blue-300 bg-blue-50 p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-2">Total a declarar y pagar</p>
        <p className="text-4xl font-bold text-blue-800"><SiiMoney v={resumen.totalAPagar} /></p>
        <p className="text-xs text-blue-500 mt-2">Vence el dia 12 del mes siguiente (o el habil siguiente)</p>
      </div>

      {/* Formula explanation */}
      <div className="mt-5 rounded-xl bg-neutral-50 border border-neutral-100 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3">Desglose F29</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-600">IVA Debito Fiscal</span>
            <span className="font-mono font-semibold text-neutral-900"><SiiMoney v={resumen.ivaDebito} /></span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-600">- IVA Credito Fiscal</span>
            <span className="font-mono font-semibold text-neutral-900">(<SiiMoney v={resumen.ivaCredito} />)</span>
          </div>
          <div className="border-t border-dashed border-neutral-200 pt-2 flex justify-between">
            <span className={`font-semibold ${hayDeuda ? 'text-red-700' : 'text-green-700'}`}>
              = {hayDeuda ? 'IVA a pagar' : 'Remanente credito'}
            </span>
            <span className={`font-mono font-semibold ${hayDeuda ? 'text-red-700' : 'text-green-700'}`}>
              <SiiMoney v={hayDeuda ? resumen.ivaAPagar : resumen.remanente} />
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-600">+ PPM (1% ventas netas)</span>
            <span className="font-mono font-semibold text-neutral-900"><SiiMoney v={resumen.ppm} /></span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-600">+ Retencion Honorarios (13,75%)</span>
            <span className="font-mono font-semibold text-neutral-900"><SiiMoney v={resumen.retencionHonorarios} /></span>
          </div>
          <div className="border-t-2 border-neutral-300 pt-2 flex justify-between font-bold">
            <span className="text-blue-800">Total a Pagar</span>
            <span className="font-mono text-blue-800"><SiiMoney v={resumen.totalAPagar} /></span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-4 flex gap-3">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#2563eb" strokeWidth="1.5" className="shrink-0 mt-0.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 7v5M8 5h.01"/></svg>
        <p className="text-xs text-blue-700 leading-relaxed">
          Esta es una vista previa basada en los DTEs del mes. Para declarar oficialmente, accede al{' '}
          <strong>Portal MIPYME del SII</strong> o usa tu software de contabilidad compatible.
          Tasa IVA vigente: 19% (D.L. 825).
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SiiPage() {
  const [step, setStep]             = useState<Step>('rut');
  const [rutInput, setRutInput]     = useState('');
  const [rutValid, setRutValid]     = useState<boolean | null>(null);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('clave_tributaria');
  const [password, setPassword]     = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [authError, setAuthError]   = useState('');
  const [activeTab, setActiveTab]   = useState<FacturaTab>('emitidas');
  const [sessionRut, setSessionRut] = useState('');
  const [periodo, setPeriodo]       = useState('202604');

  // Real facturas fetched from the backend (fall back to mock data on error)
  const [emitidas, setEmitidas]           = useState<FacturaMock[]>([]);
  const [recibidas, setRecibidas]         = useState<FacturaMock[]>([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [fetchError, setFetchError]       = useState('');

  const handleRutChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw     = e.target.value.replace(/[^0-9kK]/g, '');
    const trimmed = raw.slice(0, 9);
    const formatted = formatRut(trimmed);
    setRutInput(formatted);
    setRutValid(trimmed.length >= 7 ? validateRut(formatted) : null);
  }, []);

  const handleRutSubmit = () => {
    if (rutValid) setStep('auth');
  };

  const handleAuth = async () => {
    if (!password) { setAuthError('Ingresa tu contraseña.'); return; }
    setLoading(true);
    setAuthError('');
    const capturedRut = rutInput; // capture before any await (avoids stale closure)
    try {
      const res = await fetch('/api/sii/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rut: capturedRut, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data?.error ?? 'Error al autenticar con el SII. Verifica tus credenciales.');
        return;
      }
      setSessionRut(data.rutMasked ?? capturedRut);
      setPassword(''); // clear credentials immediately
      setStep('dashboard');
    } catch {
      setAuthError('Error de conexión. Verifica que el servidor backend esté activo.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = () => {
    // Clave Única OAuth: In production this redirects to the government OAuth portal.
    // The SII backend currently only supports Clave Tributaria (password-based auth).
    // Show an informative message instead of simulating success.
    setAuthError('Clave Única aún no está habilitada. Usa Clave Tributaria por ahora.');
  };

  const logout = () => {
    // Clear session cookies server-side
    fetch('/api/sii/auth', { method: 'DELETE' }).catch(() => {});
    setStep('rut');
    setRutInput('');
    setRutValid(null);
    setPassword('');
    setSessionRut('');
    setAuthError('');
    setEmitidas([]);
    setRecibidas([]);
    setFetchError('');
  };

  // Fetch real facturas whenever the dashboard step is active or the period changes
  useEffect(() => {
    if (step !== 'dashboard') return;

    let cancelled = false;

    const loadFacturas = async () => {
      setLoadingFacturas(true);
      setFetchError('');

      try {
        const [resE, resR] = await Promise.all([
          fetch(`/api/sii/auth?tipo=emitidas&periodo=${periodo}`, { cache: 'no-store' }),
          fetch(`/api/sii/auth?tipo=recibidas&periodo=${periodo}`, { cache: 'no-store' }),
        ]);

        if (cancelled) return;

        // Session expired — go back to login
        if (resE.status === 401 || resR.status === 401) {
          setStep('rut');
          setSessionRut('');
          return;
        }

        const [dataE, dataR] = await Promise.all([
          resE.ok ? resE.json() : Promise.resolve({ facturas: [] }),
          resR.ok ? resR.json() : Promise.resolve({ facturas: [] }),
        ]);

        if (cancelled) return;

        const mappedE: FacturaMock[] = (dataE.facturas ?? []).map(
          (f: FacturaApiDto) => mapApiToMock(f, 'emitidas'),
        );
        const mappedR: FacturaMock[] = (dataR.facturas ?? []).map(
          (f: FacturaApiDto) => mapApiToMock(f, 'recibidas'),
        );

        // Use real data if available, otherwise fall back to mock for display
        setEmitidas(mappedE.length > 0 ? mappedE : MOCK_EMITIDAS);
        setRecibidas(mappedR.length > 0 ? mappedR : MOCK_RECIBIDAS);
      } catch (err) {
        if (cancelled) return;
        console.error('[SII] Error fetching facturas:', err);
        setFetchError('No se pudo conectar al servidor. Mostrando datos de ejemplo.');
        setEmitidas(MOCK_EMITIDAS);
        setRecibidas(MOCK_RECIBIDAS);
      } finally {
        if (!cancelled) setLoadingFacturas(false);
      }
    };

    loadFacturas();
    return () => { cancelled = true; };
  }, [step, periodo]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      className="min-h-full p-6"
    >
      <AnimatePresence mode="wait">

        {/* ─── STEP 1: RUT ─── */}
        {step === 'rut' && (
          <motion.div
            key="step-rut"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="max-w-md mx-auto mt-16"
          >
            {/* Header */}
            <div className="text-center mb-10">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="22" height="22" rx="3"/>
                  <path d="M9 10h10M9 14h10M9 18h6"/>
                  <path d="M3 8h4v12H3"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Conectar con SII</h2>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Ingresa tu RUT tributario para consultar facturas, calcular IVA y
                preparar tu declaración mensual.
              </p>
            </div>

            {/* RUT input */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                RUT Tributario
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={rutInput}
                  onChange={handleRutChange}
                  onKeyDown={e => e.key === 'Enter' && rutValid && handleRutSubmit()}
                  placeholder="12.345.678-9"
                  className={`w-full rounded-xl border-2 px-4 py-3 text-lg font-mono tracking-wide outline-none transition-all ${
                    rutValid === true  ? 'border-green-400 bg-green-50' :
                    rutValid === false ? 'border-red-400 bg-red-50' :
                    'border-neutral-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100'
                  }`}
                  maxLength={12}
                />
                {rutValid !== null && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${rutValid ? 'text-green-500' : 'text-red-500'}`}>
                    {rutValid
                      ? <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 10l5 5 7-8"/></svg>
                      : <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l8 8M14 6l-8 8"/></svg>
                    }
                  </span>
                )}
              </div>
              {rutValid === false && (
                <p className="text-xs text-red-600 mt-2">RUT inválido — verifica el dígito verificador.</p>
              )}
              {rutValid === true && (
                <p className="text-xs text-green-600 mt-2">RUT válido ✓</p>
              )}

              <button
                onClick={handleRutSubmit}
                disabled={!rutValid}
                className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuar →
              </button>
            </div>

            {/* Security note */}
            <div className="flex items-start gap-2 text-xs text-neutral-400">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" className="shrink-0 mt-0.5"><path d="M7 2L2.5 4v4c0 2.5 2 4.5 4.5 5 2.5-.5 4.5-2.5 4.5-5V4L7 2z"/></svg>
              <span>Tu RUT se valida localmente con el algoritmo Mod-11 del SII. Ningún dato se envía hasta que inicies sesión.</span>
            </div>
          </motion.div>
        )}

        {/* ─── STEP 2: AUTH ─── */}
        {step === 'auth' && (
          <motion.div
            key="step-auth"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="max-w-md mx-auto mt-10"
          >
            <button onClick={() => setStep('rut')} className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 mb-6 transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2L4 6l4 4"/></svg>
              Volver
            </button>

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                  <span className="text-sm font-mono font-bold text-neutral-700">{rutInput}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">Autenticación SII</p>
                  <p className="text-xs text-neutral-400">{rutInput}</p>
                </div>
              </div>

              {/* Method selector */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { key: 'clave_unica' as AuthMethod,     label: 'Clave Única', sub: 'Portal Gobierno de Chile', recommended: true },
                  { key: 'clave_tributaria' as AuthMethod, label: 'Clave Tributaria', sub: 'Contraseña SII directo', recommended: false },
                ].map(m => (
                  <button
                    key={m.key}
                    onClick={() => { setAuthMethod(m.key); setAuthError(''); }}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      authMethod === m.key ? 'border-blue-500 bg-blue-50' : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    {m.recommended && (
                      <span className="inline-block mb-1.5 rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-green-700">Recomendado</span>
                    )}
                    <p className={`text-sm font-bold ${authMethod === m.key ? 'text-blue-700' : 'text-neutral-800'}`}>{m.label}</p>
                    <p className="text-[11px] text-neutral-400">{m.sub}</p>
                  </button>
                ))}
              </div>

              {/* Clave Única flow */}
              {authMethod === 'clave_unica' && (
                <div>
                  <div className="rounded-xl bg-green-50 border border-green-200 p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#16a34a" strokeWidth="1.5" className="shrink-0 mt-0.5"><path d="M8 2L2.5 4.5v4c0 2.8 2.3 5 5.5 5.5 3.2-.5 5.5-2.7 5.5-5.5v-4L8 2z"/></svg>
                      <div>
                        <p className="text-xs font-semibold text-green-800">Autenticación segura vía OAuth 2.0</p>
                        <p className="text-[11px] text-green-700 mt-0.5 leading-relaxed">
                          Serás redirigido al portal oficial del Gobierno de Chile.
                          Tu contraseña <strong>nunca</strong> pasa por nuestra plataforma.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleOAuth}
                    disabled={loading}
                    className="w-full rounded-xl bg-[#1a3a5c] py-3 text-sm font-bold text-white hover:bg-[#122840] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? (
                      <><svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6" strokeDasharray="20" strokeDashoffset="10"/></svg>Conectando...</>
                    ) : (
                      <>🇨🇱 Autenticar con Clave Única</>
                    )}
                  </button>
                  {authError && <p className="text-xs text-red-600 mt-3">{authError}</p>}
                </div>
              )}

              {/* Clave Tributaria flow */}
              {authMethod === 'clave_tributaria' && (
                <div>
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4 flex items-start gap-2">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#b45309" strokeWidth="1.3" className="shrink-0 mt-0.5"><path d="M7 2L1.5 11h11L7 2z"/><path d="M7 6v3M7 10h.01"/></svg>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Tu contraseña se envía <strong>directamente al SII</strong> a través de nuestro servidor proxy seguro (TLS 1.3).
                      No se almacena en ningún momento.
                    </p>
                  </div>

                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Clave Tributaria</label>
                  <div className="relative mb-4">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAuth()}
                      placeholder="Tu contraseña SII"
                      className="w-full rounded-xl border-2 border-neutral-200 px-4 py-3 text-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                        {showPwd
                          ? <><path d="M1 9c2-4 4.5-6 8-6s6 2 8 6c-2 4-4.5 6-8 6S3 13 1 9z"/><circle cx="9" cy="9" r="2"/><path d="M3 3l12 12"/></>
                          : <><path d="M1 9c2-4 4.5-6 8-6s6 2 8 6c-2 4-4.5 6-8 6S3 13 1 9z"/><circle cx="9" cy="9" r="2"/></>
                        }
                      </svg>
                    </button>
                  </div>

                  {authError && <p className="text-xs text-red-600 mb-3">{authError}</p>}

                  <button
                    onClick={handleAuth}
                    disabled={loading || !password}
                    className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <><svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6" strokeDasharray="20" strokeDashoffset="10"/></svg>Autenticando...</>
                    ) : 'Ingresar al SII →'}
                  </button>
                </div>
              )}
            </div>

            {/* Security badges */}
            <div className="mt-4 flex items-center justify-center gap-6 text-[10px] text-neutral-400">
              {['TLS 1.3', 'Sin almacenamiento de credenciales', 'Sesión 30 min'].map(b => (
                <span key={b} className="flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M5 1L1.5 3v3c0 1.7 1.5 3 3.5 3.5C7 9 8.5 7.7 8.5 6V3L5 1z"/></svg>
                  {b}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── STEP 3: DASHBOARD ─── */}
        {step === 'dashboard' && (
          <motion.div
            key="step-dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {/* Session bar */}
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-sm font-semibold text-green-800">
                  Sesión activa — RUT {sessionRut}
                </p>
                <span className="text-xs text-green-600 bg-green-100 rounded-full px-2 py-0.5">Expira en 30 min</span>
              </div>
              <button onClick={logout} className="text-xs text-green-700 hover:text-green-900 font-semibold transition-colors">
                Cerrar sesión
              </button>
            </div>

            {/* Period selector + summary KPIs */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900">Período de consulta</h2>
              <div className="flex items-center gap-2">
                {['202402','202501','202502','202503','202604'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriodo(p)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      periodo === p ? 'bg-blue-600 text-white' : 'bg-white border border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                    }`}
                  >
                    {p.slice(0, 4)}/{p.slice(4)}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI summary */}
            <motion.div variants={staggerContainer} initial="initial" animate="animate"
              className="grid grid-cols-4 gap-4"
            >
              {(() => {
                const resumen = calcIvaResumen(emitidas, recibidas);
                const totalEmitidas = emitidas.reduce((s, f) => s + f.total, 0);
                const totalRecibidas = recibidas.reduce((s, f) => s + f.total, 0);
                return [
                  { label: 'Facturación emitida',  amount: totalEmitidas,             sub: `${emitidas.length} documentos`,  color: 'text-blue-600' },
                  { label: 'Compras recibidas',     amount: totalRecibidas,            sub: `${recibidas.length} documentos`, color: 'text-neutral-900' },
                  { label: 'IVA débito fiscal',     amount: resumen.ivaDebito,         sub: '19% sobre ventas afectas',           color: 'text-orange-600' },
                  { label: resumen.ivaAPagar > 0 ? 'IVA a pagar' : 'Remanente crédito',
                    amount: resumen.ivaAPagar || resumen.remanente,
                    sub: resumen.ivaAPagar > 0 ? 'Vence día 12 próx. mes' : 'Acumulado para mes siguiente',
                    color: resumen.ivaAPagar > 0 ? 'text-red-600' : 'text-green-600' },
                ].map(kpi => (
                  <motion.div key={kpi.label} variants={staggerItem}
                    className="bg-white rounded-xl border border-neutral-100 shadow-sm px-5 py-4"
                  >
                    <p className="text-xs text-neutral-400 mb-1">{kpi.label}</p>
                    <p className={`text-2xl font-bold ${kpi.color}`}><SiiMoney v={kpi.amount} /></p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">{kpi.sub}</p>
                  </motion.div>
                ));
              })()}
            </motion.div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden">
              <div className="flex border-b border-neutral-200">
                {[
                  { key: 'emitidas'  as FacturaTab, label: `Facturas Emitidas (${emitidas.length})` },
                  { key: 'recibidas' as FacturaTab, label: `Facturas Recibidas (${recibidas.length})` },
                  { key: 'iva'       as FacturaTab, label: 'Declaración F29' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? 'border-blue-600 text-blue-700 bg-blue-50'
                        : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
                {/* Data freshness / error indicator */}
                <div className="ml-auto flex items-center px-4 text-[11px] gap-1.5">
                  {fetchError ? (
                    <span className="text-amber-600 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      {fetchError}
                    </span>
                  ) : (
                    <span className="text-neutral-400 flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${loadingFacturas ? 'bg-blue-400 animate-pulse' : 'bg-green-400'}`} />
                      {loadingFacturas ? 'Cargando datos...' : `Datos al ${new Date().toLocaleDateString('es-CL', { day:'numeric', month:'long' })}`}
                    </span>
                  )}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {loadingFacturas ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-3 py-16 text-neutral-400"
                  >
                    <svg className="animate-spin" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="10" cy="10" r="8" strokeDasharray="30" strokeDashoffset="15"/>
                    </svg>
                    <span className="text-sm">Obteniendo datos del SII...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === 'emitidas'  && <FacturaTable facturas={emitidas}  tipo="emitidas" />}
                    {activeTab === 'recibidas' && <FacturaTable facturas={recibidas} tipo="recibidas" />}
                    {activeTab === 'iva'       && <IvaPanel emitidas={emitidas} recibidas={recibidas} />}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Legal disclaimer */}
            <div className="flex items-start gap-2 rounded-xl bg-neutral-50 border border-neutral-200 p-4">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#6b7280" strokeWidth="1.3" className="shrink-0 mt-0.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 6.5v4M7 5h.01"/></svg>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                <strong>Información de uso:</strong> Los datos mostrados son extraídos directamente del SII usando tu sesión activa.
                La sesión expira automáticamente a los 30 minutos. Los datos no se almacenan en nuestros servidores.
                Esta herramienta es informativa — para declaraciones oficiales usa el Portal MIPYME del SII.
              </p>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
