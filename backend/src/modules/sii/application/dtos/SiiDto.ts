import { Factura, EstadoSII, TipoDocumento } from '../../domain/entities/Factura';

/**
 * DTOs for SII module — clean API surface between presentation and application layers.
 */

export interface AuthWithSiiDto {
  /** Full formatted RUT: XX.XXX.XXX-X */
  rut: string;
  /** Clave Tributaria — NEVER logged, NEVER stored */
  password: string;
}

export interface AuthWithSiiResponseDto {
  /** Opaque, encrypted session token — frontend stores in memory only */
  sessionToken: string;
  /** UTC timestamp when token expires */
  expiresAt: string;
  /** Partial RUT for display (masked) */
  rutMasked: string;
}

export interface FetchFacturasDto {
  sessionToken: string;
  rut: string;
  /** Period in AAAAMM format, e.g. '202604' */
  periodo: string;
  tipo: 'emitidas' | 'recibidas';
}

export interface FacturaDto {
  folio:               number;
  tipoDocumento:       TipoDocumento;
  fechaEmision:        string;   // ISO date string
  rutEmisor:           string;
  razonSocialEmisor:   string;
  rutReceptor:         string;
  razonSocialReceptor: string;
  montoNeto:           number;
  iva:                 number;
  montoTotal:          number;
  estado:              EstadoSII;
  glosa?:              string;
}

export interface IvaResumenDto {
  periodo:          string;
  ivaDebito:        number;   // IVA from facturas emitidas (what you owe)
  ivaCredito:       number;   // IVA from facturas recibidas (what you can deduct)
  ivaAPagar:        number;   // max(0, ivaDebito - ivaCredito)
  remanente:        number;   // max(0, ivaCredito - ivaDebito)
  ventasNetas:      number;
  comprasNetas:     number;
  cantidadEmitidas: number;
  cantidadRecibidas:number;
}

export function toFacturaDto(f: Factura): FacturaDto {
  return {
    folio:               f.folio,
    tipoDocumento:       f.tipoDocumento,
    fechaEmision:        f.fechaEmision.toISOString().split('T')[0],
    rutEmisor:           f.rutEmisor,
    razonSocialEmisor:   f.razonSocialEmisor,
    rutReceptor:         f.rutReceptor,
    razonSocialReceptor: f.razonSocialReceptor,
    montoNeto:           f.montoNeto,
    iva:                 f.iva,
    montoTotal:          f.montoTotal,
    estado:              f.estado,
    glosa:               f.glosa,
  };
}
