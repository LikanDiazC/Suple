/**
 * ==========================================================================
 * Factura — Domain Entity (DTE — Documento Tributario Electrónico)
 * ==========================================================================
 *
 * Represents a Chilean electronic invoice as defined by the SII.
 * IVA rate: 19% (tasa vigente según Ley 825 D.L.)
 *
 * ==========================================================================
 */

export type TipoDocumento =
  | 'FACTURA_AFECTA'              // código 33
  | 'FACTURA_NO_AFECTA'           // código 34
  | 'BOLETA_ELECTRONICA'          // código 39
  | 'BOLETA_NO_AFECTA'            // código 41
  | 'LIQUIDACION'                 // código 43
  | 'FACTURA_COMPRA'              // código 46
  | 'NOTA_DEBITO'                 // código 56
  | 'NOTA_CREDITO'                // código 61
  | 'BOLETA_HONORARIOS'           // código 71 — retención 13.75%
  | 'BOLETA_HONORARIOS_EXENTA';   // código 70

export type EstadoSII =
  | 'ACEPTADO'
  | 'ACEPTADO_CON_REPAROS'
  | 'RECHAZADO'
  | 'PENDIENTE';

export interface Factura {
  folio:          number;
  tipoDocumento:  TipoDocumento;
  fechaEmision:   Date;
  rutEmisor:      string;    // masked RUT string
  razonSocialEmisor: string;
  rutReceptor:    string;
  razonSocialReceptor: string;
  montoNeto:      number;    // amount before IVA (CLP)
  iva:            number;    // 19% of montoNeto
  montoTotal:     number;    // montoNeto + iva
  estado:         EstadoSII;
  glosa?:         string;    // optional description
}

// IVA rate constant (19% as per Chilean tax law D.L. 825)
export const IVA_RATE = 0.19;

// PPM rate (Pagos Provisionales Mensuales) — default 1%, configurable
export const PPM_RATE_DEFAULT = 0.01;

// Retención de Boletas de Honorarios — 13.75% (2024-2028 transitorio)
export const RETENCION_HONORARIOS_RATE = 0.1375;

export function calcularIva(montoNeto: number): number {
  return Math.round(montoNeto * IVA_RATE);
}

export function calcularTotal(montoNeto: number): number {
  return montoNeto + calcularIva(montoNeto);
}

/**
 * Mapping from SII numeric codes to domain TipoDocumento.
 * Source: SII Resolución Exenta SN N°35/2004 (updated 2025)
 */
export const SII_CODE_TO_TIPO: Record<number, TipoDocumento> = {
  33: 'FACTURA_AFECTA',
  34: 'FACTURA_NO_AFECTA',
  39: 'BOLETA_ELECTRONICA',
  41: 'BOLETA_NO_AFECTA',
  43: 'LIQUIDACION',
  46: 'FACTURA_COMPRA',
  56: 'NOTA_DEBITO',
  61: 'NOTA_CREDITO',
  70: 'BOLETA_HONORARIOS_EXENTA',
  71: 'BOLETA_HONORARIOS',
};

export const TIPO_TO_SII_CODE: Record<TipoDocumento, number> = Object.fromEntries(
  Object.entries(SII_CODE_TO_TIPO).map(([code, tipo]) => [tipo, Number(code)]),
) as Record<TipoDocumento, number>;
