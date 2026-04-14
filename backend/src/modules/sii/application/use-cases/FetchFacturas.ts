import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ISiiRepository, SII_REPOSITORY } from '../../domain/repositories/ISiiRepository';
import { FetchFacturasDto, FacturaDto, toFacturaDto } from '../dtos/SiiDto';

/**
 * ==========================================================================
 * FetchFacturas — Use Case
 * ==========================================================================
 *
 * Retrieves emitidas or recibidas invoices from SII for a given period.
 *
 * SECURITY:
 *  - Verifies session token is still valid before fetching.
 *  - Returns only DTO (no domain internals exposed).
 *  - Audit logging is the controller's responsibility.
 *
 * ==========================================================================
 */
@Injectable()
export class FetchFacturasUseCase {
  constructor(
    @Inject(SII_REPOSITORY)
    private readonly siiRepo: ISiiRepository,
  ) {}

  async execute(dto: FetchFacturasDto): Promise<FacturaDto[]> {
    // Validate session is still active
    const sessionValid = await this.siiRepo.isSessionValid(dto.sessionToken);
    if (!sessionValid) {
      throw new UnauthorizedException('La sesión SII ha expirado. Por favor autentícate nuevamente.');
    }

    const facturas =
      dto.tipo === 'emitidas'
        ? await this.siiRepo.getFacturasEmitidas(dto.sessionToken, dto.rut, dto.periodo)
        : await this.siiRepo.getFacturasRecibidas(dto.sessionToken, dto.rut, dto.periodo);

    return facturas.map(toFacturaDto);
  }
}
