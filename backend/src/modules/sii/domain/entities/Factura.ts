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
  | 'FACTURA_AFECTA'      // código 33
  | 'FACTURA_NO_AFECTA'   // código 34
  | 'BOLETA_ELECTRONICA'  // código 39
  | 'LIQUIDACION'         // código 43
  | 'NOTA_DEBITO'         // código 56
  | 'NOTA_CREDITO';       // código 61

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

// IVA rate constant (19% as per Chilean tax law)
export const IVA_RATE = 0.19;

export function calcularIva(montoNeto: number): number {
  return Math.round(montoNeto * IVA_RATE);
}

export function calcularTotal(montoNeto: number): number {
  return montoNeto + calcularIva(montoNeto);
}
