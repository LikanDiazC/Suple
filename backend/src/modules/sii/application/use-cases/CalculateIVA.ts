import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ISiiRepository, SII_REPOSITORY } from '../../domain/repositories/ISiiRepository';
import { IvaResumenDto } from '../dtos/SiiDto';

/**
 * ==========================================================================
 * CalculateIVA — Use Case
 * ==========================================================================
 *
 * Computes the monthly IVA (F29) summary for a given period:
 *
 *   IVA Débito Fiscal  = Σ IVA from facturas emitidas afectas
 *   IVA Crédito Fiscal = Σ IVA from facturas recibidas afectas
 *   IVA a pagar        = max(0, IVA Débito - IVA Crédito)
 *   Remanente crédito  = max(0, IVA Crédito - IVA Débito)
 *
 * This mirrors the F29 monthly declaration (Formulario 29) logic.
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

    // Only FACTURA_AFECTA (code 33) affects IVA
    const afectasEmitidas  = emitidas.filter(f => f.tipoDocumento === 'FACTURA_AFECTA');
    const afectasRecibidas = recibidas.filter(f => f.tipoDocumento === 'FACTURA_AFECTA');

    const ivaDebito  = afectasEmitidas.reduce((s, f) => s + f.iva, 0);
    const ivaCredito = afectasRecibidas.reduce((s, f) => s + f.iva, 0);

    const ivaAPagar = Math.max(0, ivaDebito - ivaCredito);
    const remanente = Math.max(0, ivaCredito - ivaDebito);

    const ventasNetas  = afectasEmitidas.reduce((s, f) => s + f.montoNeto, 0);
    const comprasNetas = afectasRecibidas.reduce((s, f) => s + f.montoNeto, 0);

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
    };
  }
}
