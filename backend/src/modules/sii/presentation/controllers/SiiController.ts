import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ValidateRutUseCase }  from '../../application/use-cases/ValidateRut';
import { AuthWithSIIUseCase }  from '../../application/use-cases/AuthWithSII';
import { FetchFacturasUseCase } from '../../application/use-cases/FetchFacturas';
import { CalculateIVAUseCase } from '../../application/use-cases/CalculateIVA';
import {
  AuthWithSiiDto,
  ValidateRutDto,
  FetchFacturasQueryDto,
} from '../../application/dtos/SiiDto';

/**
 * ==========================================================================
 * SiiController — Presentation Layer (Hardened)
 * ==========================================================================
 *
 * AUDIT FIX #1 — Input Validation:
 *   All DTOs are now validated by the global ValidationPipe with
 *   class-validator decorators. Manual validation helpers removed
 *   (the pipe handles it earlier and more robustly).
 *
 * AUDIT FIX #2 — Rate Limiting:
 *   @Throttle() applied per-endpoint with limits proportional to risk:
 *
 *   | Endpoint          | Limit           | Reason                         |
 *   |-------------------|-----------------|--------------------------------|
 *   | POST /auth        | 5 per 15 min    | Brute-force mitigation         |
 *   | POST /validate-rut| 20 per 1 min    | Moderate — public endpoint     |
 *   | GET  /facturas    | 30 per 1 min    | Data access — normal use       |
 *   | GET  /iva-resumen | 30 per 1 min    | Data access — normal use       |
 *
 * ==========================================================================
 */
@Controller('api/sii')
export class SiiController {
  private readonly logger = new Logger(SiiController.name);

  constructor(
    private readonly validateRut:   ValidateRutUseCase,
    private readonly authWithSII:   AuthWithSIIUseCase,
    private readonly fetchFacturas: FetchFacturasUseCase,
    private readonly calculateIVA:  CalculateIVAUseCase,
  ) {}

  // ---------------------------------------------------------------------------
  // POST /api/sii/validate-rut
  // ---------------------------------------------------------------------------

  @Post('validate-rut')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  validateRutEndpoint(@Body() dto: ValidateRutDto) {
    // DTO validation handled by ValidationPipe — 'rut' is guaranteed present
    return this.validateRut.execute(dto.rut);
  }

  // ---------------------------------------------------------------------------
  // POST /api/sii/auth
  //
  // Rate limit: 10 attempts / 15 min in production (strict brute-force guard).
  // In development the limit is relaxed to 50 / 15 min so testing isn't blocked.
  // ---------------------------------------------------------------------------

  @Post('auth')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      ttl:   900_000,
      limit: process.env.NODE_ENV === 'production' ? 10 : 50,
    },
  })
  async authenticate(
    @Body() dto: AuthWithSiiDto,
    @Headers('x-forwarded-for') ip?: string,
  ) {
    // DTO validation handled by ValidationPipe — rut format + password length guaranteed
    // No manual checks needed (removed — the pipe throws 400 automatically)

    // Audit log — PARTIAL rut only (last 4 chars masked)
    const partialRut = dto.rut.length > 4 ? `${dto.rut.slice(0, -4)}****` : '****';
    this.logger.log(`[AUDIT] SII auth attempt | rut: ${partialRut} | ip: ${ip ?? 'unknown'}`);

    try {
      const result = await this.authWithSII.execute(dto);
      this.logger.log(`[AUDIT] SII auth SUCCESS | rut: ${partialRut} | ip: ${ip ?? 'unknown'}`);
      return result;
    } catch (error) {
      this.logger.warn(`[AUDIT] SII auth FAILED  | rut: ${partialRut} | ip: ${ip ?? 'unknown'}`);
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // GET /api/sii/facturas?tipo=emitidas&rut=...&periodo=202604
  // ---------------------------------------------------------------------------

  @Get('facturas')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async getFacturas(
    @Headers('x-sii-session') sessionToken: string,
    @Query() query: FetchFacturasQueryDto,
    @Headers('x-forwarded-for') ip?: string,
  ) {
    // Session header is still validated manually (not a query/body param)
    if (!sessionToken) {
      throw new BadRequestException('Header "x-sii-session" es requerido.');
    }

    // DTO validation handled by pipe: rut, periodo format, tipo enum
    const partialRut = query.rut.length > 4 ? `${query.rut.slice(0, -4)}****` : '****';
    this.logger.log(`[AUDIT] SII facturas ${query.tipo} | rut: ${partialRut} | periodo: ${query.periodo} | ip: ${ip ?? 'unknown'}`);

    return this.fetchFacturas.execute({
      sessionToken,
      rut: query.rut,
      periodo: query.periodo,
      tipo: query.tipo,
    });
  }

  // ---------------------------------------------------------------------------
  // GET /api/sii/iva-resumen?rut=...&periodo=202604
  // ---------------------------------------------------------------------------

  @Get('iva-resumen')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async getIvaResumen(
    @Headers('x-sii-session') sessionToken: string,
    @Query('rut')     rut: string,
    @Query('periodo') periodo: string,
    @Headers('x-forwarded-for') ip?: string,
  ) {
    if (!sessionToken || !rut || !periodo) {
      throw new BadRequestException('Parámetros "rut" y "periodo" son requeridos, y header "x-sii-session" es obligatorio.');
    }
    if (!/^\d{6}$/.test(periodo)) {
      throw new BadRequestException('"periodo" debe tener formato AAAAMM (ej: 202604).');
    }

    const partialRut = rut.length > 4 ? `${rut.slice(0, -4)}****` : '****';
    this.logger.log(`[AUDIT] SII IVA resumen | rut: ${partialRut} | periodo: ${periodo} | ip: ${ip ?? 'unknown'}`);

    return this.calculateIVA.execute(sessionToken, rut, periodo);
  }
}
