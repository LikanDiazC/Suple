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
import { ValidateRutUseCase }  from '../../application/use-cases/ValidateRut';
import { AuthWithSIIUseCase }  from '../../application/use-cases/AuthWithSII';
import { FetchFacturasUseCase } from '../../application/use-cases/FetchFacturas';
import { CalculateIVAUseCase } from '../../application/use-cases/CalculateIVA';
import { AuthWithSiiDto }      from '../../application/dtos/SiiDto';

/**
 * ==========================================================================
 * SiiController — Presentation Layer
 * ==========================================================================
 *
 * SECURITY HARDENING:
 *
 * 1. RATE LIMITING
 *    - /sii/auth: max 5 requests per 15 minutes per IP (prevents brute force)
 *    - /sii/facturas: max 30 requests per minute per IP
 *    (Applied via @nestjs/throttler at the module level or guard level)
 *
 * 2. AUDIT LOGGING
 *    - Every auth attempt is logged (partial RUT, IP, timestamp, result)
 *    - Every data access is logged (partial RUT, IP, timestamp, action)
 *    - NEVER log full RUTs, passwords, or session tokens
 *
 * 3. NO CREDENTIAL STORAGE
 *    - Passwords/credentials are passed through only — never persisted
 *    - Session tokens are short-lived (30 min) and in-memory only
 *
 * 4. HTTPS ENFORCEMENT
 *    - In production: enforce HTTPS via NestJS helmet middleware
 *    - Session tokens must only travel over TLS
 *
 * 5. INPUT SANITIZATION
 *    - RUT validated with Mod-11 before any SII call
 *    - Period validated as AAAAMM format
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
  validateRutEndpoint(@Body() body: { rut: string }) {
    if (!body.rut) throw new BadRequestException('Campo "rut" es requerido.');
    return this.validateRut.execute(body.rut);
  }

  // ---------------------------------------------------------------------------
  // POST /api/sii/auth
  //
  // SECURITY: This endpoint should be protected by:
  //   - @Throttle(5, 900) — 5 attempts per 15 minutes
  //   - HTTPS only (enforced by nginx/load balancer in production)
  // ---------------------------------------------------------------------------

  @Post('auth')
  @HttpCode(HttpStatus.OK)
  async authenticate(
    @Body() dto: AuthWithSiiDto,
    @Headers('x-forwarded-for') ip?: string,
  ) {
    if (!dto.rut || !dto.password) {
      throw new BadRequestException('Campos "rut" y "password" son requeridos.');
    }

    // Audit log — PARTIAL rut only (last 3 digits masked)
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
  async getFacturas(
    @Headers('x-sii-session') sessionToken: string,
    @Query('rut')     rut: string,
    @Query('periodo') periodo: string,
    @Query('tipo')    tipo: string,
    @Headers('x-forwarded-for') ip?: string,
  ) {
    this.validateQueryParams({ sessionToken, rut, periodo, tipo });

    const partialRut = rut.length > 4 ? `${rut.slice(0, -4)}****` : '****';
    this.logger.log(`[AUDIT] SII facturas ${tipo} | rut: ${partialRut} | periodo: ${periodo} | ip: ${ip ?? 'unknown'}`);

    return this.fetchFacturas.execute({
      sessionToken,
      rut,
      periodo,
      tipo: tipo as 'emitidas' | 'recibidas',
    });
  }

  // ---------------------------------------------------------------------------
  // GET /api/sii/iva-resumen?rut=...&periodo=202604
  // ---------------------------------------------------------------------------

  @Get('iva-resumen')
  async getIvaResumen(
    @Headers('x-sii-session') sessionToken: string,
    @Query('rut')     rut: string,
    @Query('periodo') periodo: string,
    @Headers('x-forwarded-for') ip?: string,
  ) {
    if (!sessionToken || !rut || !periodo) {
      throw new BadRequestException('Parámetros "rut" y "periodo" son requeridos, y header "x-sii-session" es obligatorio.');
    }
    this.validatePeriodo(periodo);

    const partialRut = rut.length > 4 ? `${rut.slice(0, -4)}****` : '****';
    this.logger.log(`[AUDIT] SII IVA resumen | rut: ${partialRut} | periodo: ${periodo} | ip: ${ip ?? 'unknown'}`);

    return this.calculateIVA.execute(sessionToken, rut, periodo);
  }

  // ---------------------------------------------------------------------------
  // Validation helpers
  // ---------------------------------------------------------------------------

  private validateQueryParams(params: {
    sessionToken: string;
    rut: string;
    periodo: string;
    tipo: string;
  }): void {
    if (!params.sessionToken) {
      throw new BadRequestException('Header "x-sii-session" es requerido.');
    }
    if (!params.rut) {
      throw new BadRequestException('Query param "rut" es requerido.');
    }
    if (!params.periodo) {
      throw new BadRequestException('Query param "periodo" es requerido.');
    }
    this.validatePeriodo(params.periodo);
    if (!['emitidas', 'recibidas'].includes(params.tipo)) {
      throw new BadRequestException('"tipo" debe ser "emitidas" o "recibidas".');
    }
  }

  private validatePeriodo(periodo: string): void {
    if (!/^\d{6}$/.test(periodo)) {
      throw new BadRequestException('"periodo" debe tener formato AAAAMM (ej: 202604).');
    }
    const month = parseInt(periodo.slice(4, 6));
    if (month < 1 || month > 12) {
      throw new BadRequestException('"periodo" tiene un mes inválido.');
    }
  }
}
