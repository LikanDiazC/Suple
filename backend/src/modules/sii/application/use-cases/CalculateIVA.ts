import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ISiiRepository, SII_REPOSITORY } from '../../domain/repositories/ISiiRepository';
import { IvaResumenDto } from '../dtos/SiiDto';
import { PPM_RATE_DEFAULT, RETENCION_HONORARIOS_RATE } from '../../domain/entities/Factura';

/**
 * ==========================================================================
 * CalculateIVA — Use Case (F29 completo)
 * ==========================================================================
 *
 * Computes the monthly IVA (F29) summary for a given period:
 *
 *   IVA Débito Fiscal  = Σ IVA from facturas emitidas afectas (tipo 33)
 *   IVA Crédito Fiscal = Σ IVA from facturas recibidas afectas (tipo 33)
 *   IVA a pagar        = max(0, IVA Débito - IVA Crédito)
 *   Remanente crédito  = max(0, IVA Crédito - IVA Débito)
 *
 * Extended F29 fields:
 *   PPM (Pagos Provisionales Mensuales) = 1% of ventas netas (configurable)
 *   Retención Honorarios = 13.75% of neto de boletas de honorarios recibidas
 *   Total a Pagar = IVA a Pagar + PPM + Total Retenciones
 *
 * Chilean tax law references:
 *   - D.L. 825 (IVA 19%)
 *   - Art. 84 a) LIR (PPM 1% default primera categoría)
 *   - Art. 74 N°2 LIR (retención honorarios 13.75% transitorio 2024-2028)
 *
 * ==========================================================================
 */
@Injectable()
export class CalculateIVAUseCase {
  constructor(
    @Inject(SII_REPOSITORY)
    private readonly siiRepo: ISiiRepository,
  ) {}

  async execute(
    sessionToken: string,
    rut: string,
    periodo: string,
  ): Promise<IvaResumenDto> {
    const sessionValid = await this.siiRepo.isSessionValid(sessionToken);
    if (!sessionValid) {
      throw new UnauthorizedException('La sesión SII ha expirado.');
    }

    const [emitidas, recibidas] = await Promise.all([
      this.siiRepo.getFacturasEmitidas(sessionToken, rut, periodo),
      this.siiRepo.getFacturasRecibidas(sessionToken, rut, periodo),
    ]);

    // ── IVA Débito / Crédito ──────────────────────────────────────────
    // Only FACTURA_AFECTA (code 33) affects IVA
    const afectasEmitidas  = emitidas.filter(f => f.tipoDocumento === 'FACTURA_AFECTA');
    const afectasRecibidas = recibidas.filter(f => f.tipoDocumento === 'FACTURA_AFECTA');

    const ivaDebito  = afectasEmitidas.reduce((s, f) => s + f.iva, 0);
    const ivaCredito = afectasRecibidas.reduce((s, f) => s + f.iva, 0);

    const ivaAPagar = Math.max(0, ivaDebito - ivaCredito);
    const remanente = Math.max(0, ivaCredito - ivaDebito);

    const ventasNetas  = afectasEmitidas.reduce((s, f) => s + f.montoNeto, 0);
    const comprasNetas = afectasRecibidas.reduce((s, f) => s + f.montoNeto, 0);

    // ── PPM (Pagos Provisionales Mensuales) ───────────────────────────
    // Art. 84 a) LIR: 1% of net sales for primera categoría taxpayers
    const ppmRate = PPM_RATE_DEFAULT; // 0.01
    const ppm = Math.round(ventasNetas * ppmRate);

    // ── Retención Boletas de Honorarios ───────────────────────────────
    // Art. 74 N°2 LIR: 13.75% transitorio (2024-2028) sobre honorarios
    // Se retiene sobre el monto bruto de boletas de honorarios recibidas
    const boletasHonorarios = recibidas.filter(
      f => f.tipoDocumento === 'BOLETA_HONORARIOS',
    );
    const baseHonorarios = boletasHonorarios.reduce(
      (s, f) => s + f.montoTotal, 0,
    );
    const retencionHonorarios = Math.round(baseHonorarios * RETENCION_HONORARIOS_RATE);

    const totalRetenciones = retencionHonorarios;

    // ── Total a Pagar (F29 línea final) ───────────────────────────────
    const totalAPagar = ivaAPagar + ppm + totalRetenciones;

    return {
      periodo,
      ivaDebito,
      ivaCredito,
      ivaAPagar,
      remanente,
      ventasNetas,
      comprasNetas,
      cantidadEmitidas:  emitidas.length,
      cantidadRecibidas: recibidas.length,
      ppm,
      retencionHonorarios,
      totalRetenciones,
      totalAPagar,
    };
  }
}
