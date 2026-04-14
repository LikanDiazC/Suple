import {
  IsString,
  IsNotEmpty,
  Matches,
  MinLength,
  MaxLength,
  IsIn,
  IsOptional,
} from 'class-validator';
import { Factura, EstadoSII, TipoDocumento } from '../../domain/entities/Factura';

/**
 * ==========================================================================
 * SII DTOs — Validated with class-validator
 * ==========================================================================
 *
 * AUDIT FIX #1: Every input field is decorated with strict validation rules.
 * Combined with the global ValidationPipe (whitelist: true), any extra
 * properties (e.g. malicious __proto__, $gt, $ne) are automatically stripped
 * BEFORE reaching the use-case layer, preventing injection attacks.
 * ==========================================================================
 */

// --- Request DTOs (validated by ValidationPipe) ---

export class AuthWithSiiDto {
  /** Full formatted RUT: XX.XXX.XXX-X — validated by Mod-11 regex */
  @IsString()
  @IsNotEmpty({ message: 'Campo "rut" es requerido.' })
  @Matches(/^[\d]{1,3}(\.[\d]{3})*-[\dkK]$/, {
    message: 'RUT debe tener formato válido (ej: 12.345.678-5).',
  })
  rut!: string;

  /** Clave Tributaria — NEVER logged, NEVER stored */
  @IsString()
  @IsNotEmpty({ message: 'Campo "password" es requerido.' })
  @MinLength(6, { message: 'Clave debe tener al menos 6 caracteres.' })
  @MaxLength(128, { message: 'Clave excede largo máximo.' })
  password!: string;
}

export class ValidateRutDto {
  @IsString()
  @IsNotEmpty({ message: 'Campo "rut" es requerido.' })
  @MaxLength(15)
  rut!: string;
}

export class FetchFacturasQueryDto {
  @IsString()
  @IsNotEmpty()
  rut!: string;

  /** Period in AAAAMM format, e.g. '202604' */
  @IsString()
  @Matches(/^\d{6}$/, { message: '"periodo" debe tener formato AAAAMM (ej: 202604).' })
  periodo!: string;

  @IsString()
  @IsIn(['emitidas', 'recibidas'], { message: '"tipo" debe ser "emitidas" o "recibidas".' })
  tipo!: 'emitidas' | 'recibidas';
}

// --- Internal DTO (not exposed to API, no decorators needed) ---

export interface FetchFacturasDto {
  sessionToken: string;
  rut: string;
  periodo: string;
  tipo: 'emitidas' | 'recibidas';
}

// --- Response DTOs (outbound — no validation decorators needed) ---

export interface AuthWithSiiResponseDto {
  sessionToken: string;
  expiresAt: string;
  rutMasked: string;
}

export interface FacturaDto {
  folio:               number;
  tipoDocumento:       TipoDocumento;
  fechaEmision:        string;
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
  periodo:           string;
  ivaDebito:         number;
  ivaCredito:        number;
  ivaAPagar:         number;
  remanente:         number;
  ventasNetas:       number;
  comprasNetas:      number;
  cantidadEmitidas:  number;
  cantidadRecibidas: number;

  // --- F29 extended fields (PPM + Retenciones) ---
  /** Pagos Provisionales Mensuales — 1% (configurable) of ventasNetas */
  ppm:                    number;
  /** Retención sobre Boletas de Honorarios recibidas — 13.75% transitorio */
  retencionHonorarios:    number;
  /** Total retenciones (honorarios + otras) */
  totalRetenciones:       number;
  /** Total a pagar = ivaAPagar + ppm + totalRetenciones */
  totalAPagar:            number;
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
