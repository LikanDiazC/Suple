'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(n);

function parsePosInt(v: string | null): number {
  if (!v) return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function currentPeriodo(): string {
  const now = new Date();
  return now.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

function currentDate(): string {
  return new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Print CSS injected once
// ---------------------------------------------------------------------------

const PRINT_STYLE = `
@media print {
  nav, .no-print, button { display: none !important; }
  body { margin: 0; background: white; }
  .print-page { box-shadow: none !important; border: none !important; }
}
`;

// ---------------------------------------------------------------------------
// F29 content (needs useSearchParams, wrapped in Suspense below)
// ---------------------------------------------------------------------------

function F29Content() {
  const params = useSearchParams();
  const router = useRouter();

  const ivaDebito  = parsePosInt(params.get('ivaDebito'));
  const ivaCredito = parsePosInt(params.get('ivaCredito'));
  const ppm        = parsePosInt(params.get('ppm'));
  const retencion  = parsePosInt(params.get('retencion'));

  const ivaAPagar  = Math.max(0, ivaDebito - ivaCredito);
  const remanente  = Math.max(0, ivaCredito - ivaDebito);
  const totalAPagar = ivaAPagar + ppm + retencion;

  const rows: { codigo: string; concepto: string; monto: number; bold?: boolean; highlight?: 'red' | 'blue' }[] = [
    { codigo: '503', concepto: 'IVA Débito Fiscal',               monto: ivaDebito  },
    { codigo: '511', concepto: 'IVA Crédito Fiscal',              monto: ivaCredito },
    {
      codigo: '539',
      concepto: `IVA a pagar (503 − 511)${remanente > 0 ? ' — Remanente CF' : ''}`,
      monto: ivaAPagar > 0 ? ivaAPagar : remanente,
      highlight: ivaAPagar > 0 ? 'red' : undefined,
    },
    { codigo: '563', concepto: 'PPM Art. 84 a) LIR (1% ventas netas)', monto: ppm       },
    { codigo: '601', concepto: 'Retención Honorarios (13,75%)',         monto: retencion },
    { codigo: '—',   concepto: 'TOTAL A PAGAR',                         monto: totalAPagar, bold: true, highlight: 'blue' },
  ];

  const handlePrint = () => window.print();
  const handleBack  = () => router.back();

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLE }} />

      {/* Screen action bar — hidden on print */}
      <div className="no-print fixed top-0 inset-x-0 z-50 flex items-center justify-between bg-white/90 backdrop-blur border-b border-neutral-200 px-6 py-3 shadow-sm">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 2L5 7l4 5" />
          </svg>
          Volver
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 5V1h9v4" />
            <rect x="1" y="5" width="13" height="7" rx="1" />
            <path d="M3 9h9M5 12h5" />
          </svg>
          Imprimir / Guardar PDF
        </button>
      </div>

      {/* A4 document */}
      <div className="min-h-screen bg-neutral-100 py-20 px-4 print:bg-white print:py-0 print:px-0">
        <div className="print-page max-w-2xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden print:shadow-none print:rounded-none">

          {/* Document header */}
          <div className="border-b-4 border-blue-700 bg-blue-700 px-8 py-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-200 mb-1">
                  República de Chile — Servicio de Impuestos Internos
                </p>
                <h1 className="text-lg font-bold leading-snug">
                  FORMULARIO 29
                </h1>
                <p className="text-sm text-blue-100 mt-0.5">
                  Declaración Mensual y Pago Simultáneo de Impuestos
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-blue-200 uppercase tracking-wider">Período</p>
                <p className="text-base font-bold capitalize">{currentPeriodo()}</p>
              </div>
            </div>
          </div>

          {/* Empresa / RUT strip */}
          <div className="flex items-center justify-between border-b border-neutral-200 px-8 py-4 bg-neutral-50 text-sm">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-neutral-400">Empresa / Contribuyente</span>
              <p className="font-semibold text-neutral-800 mt-0.5">[Nombre de la Empresa]</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400">RUT</span>
              <p className="font-mono font-semibold text-neutral-800 mt-0.5">[00.000.000-0]</p>
            </div>
          </div>

          {/* F29 table */}
          <div className="px-8 py-6">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-4">
              Resumen de Impuestos
            </p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-neutral-100">
                  <th className="border border-neutral-200 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-500 w-20">
                    Código
                  </th>
                  <th className="border border-neutral-200 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    Concepto
                  </th>
                  <th className="border border-neutral-200 px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-neutral-500 w-40">
                    Monto (CLP)
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isTotal = row.bold;
                  const rowBg =
                    isTotal
                      ? 'bg-blue-50'
                      : row.highlight === 'red'
                      ? 'bg-red-50'
                      : 'bg-white';
                  const textColor =
                    isTotal
                      ? 'text-blue-800 font-bold'
                      : row.highlight === 'red'
                      ? 'text-red-700 font-semibold'
                      : 'text-neutral-700';

                  return (
                    <tr key={row.codigo} className={rowBg}>
                      <td className={`border border-neutral-200 px-4 py-3 font-mono text-xs ${isTotal ? 'text-blue-600 font-bold' : 'text-neutral-400'}`}>
                        {row.codigo}
                      </td>
                      <td className={`border border-neutral-200 px-4 py-3 ${textColor}`}>
                        {isTotal ? <strong>{row.concepto}</strong> : row.concepto}
                      </td>
                      <td className={`border border-neutral-200 px-4 py-3 text-right font-mono ${isTotal ? 'text-blue-800 font-bold text-base' : 'text-neutral-800'}`}>
                        ${fmtCLP(row.monto)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Note about remanente */}
            {remanente > 0 && (
              <p className="mt-3 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <strong>Remanente de Crédito Fiscal:</strong> ${fmtCLP(remanente)} CLP — se imputa al mes siguiente (Art. 27 DL 825).
              </p>
            )}
          </div>

          {/* Disclaimer */}
          <div className="mx-8 mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-2.5">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="#b45309" strokeWidth="1.4" className="shrink-0 mt-0.5">
              <path d="M7.5 2L1.5 13h12L7.5 2z" />
              <path d="M7.5 6v4M7.5 11h.01" />
            </svg>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              <strong>Aviso importante:</strong> Este es un resumen informativo generado por Suple a partir de los DTEs del período.
              El F29 oficial debe presentarse a través del{' '}
              <strong>Portal MIPYME del SII</strong> (mipyme.sii.cl) o mediante software contable autorizado.
              Verifique los montos con su contador antes de declarar.
            </p>
          </div>

          {/* Footer — signature + date */}
          <div className="border-t border-neutral-200 px-8 py-6">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="border-b border-neutral-400 pb-1 mb-2" style={{ minWidth: '180px' }} />
                <p className="text-[11px] text-neutral-400">Firma del Contribuyente / Representante Legal</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-neutral-500 mb-1">Fecha de generación</p>
                <p className="text-sm font-semibold text-neutral-800">{currentDate()}</p>
                <p className="text-[10px] text-neutral-400 mt-2">Generado por Suple — suple.cl</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page (Suspense boundary required for useSearchParams in Next.js App Router)
// ---------------------------------------------------------------------------

export default function F29Page() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen text-neutral-400 text-sm">
        Cargando formulario...
      </div>
    }>
      <F29Content />
    </Suspense>
  );
}
