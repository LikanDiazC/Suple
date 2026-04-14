import { Module } from '@nestjs/common';
import { SII_REPOSITORY }          from './domain/repositories/ISiiRepository';
import { InMemorySiiRepository }   from './infrastructure/repositories/InMemorySiiRepository';
import { ValidateRutUseCase }      from './application/use-cases/ValidateRut';
import { AuthWithSIIUseCase }      from './application/use-cases/AuthWithSII';
import { FetchFacturasUseCase }    from './application/use-cases/FetchFacturas';
import { CalculateIVAUseCase }     from './application/use-cases/CalculateIVA';
import { SiiController }           from './presentation/controllers/SiiController';

/**
 * ==========================================================================
 * SII Module (NestJS)
 * ==========================================================================
 *
 * Bounded context for Chilean SII (Servicio de Impuestos Internos) integration.
 *
 * ARCHITECTURE:
 *   Domain:          Rut (value object), Factura (entity), ISiiRepository (port)
 *   Application:     ValidateRut, AuthWithSII, FetchFacturas, CalculateIVA
 *   Infrastructure:  InMemorySiiRepository (dev) → SiiApiProxyRepository (prod)
 *   Presentation:    SiiController (rate-limited, audit-logged REST API)
 *
 * SECURITY POSTURE:
 *   - Credentials: never stored, never logged, only proxied
 *   - Sessions:    in-memory, 30-minute TTL, encrypted tokens
 *   - Rate limiting: 5 auth attempts / 15 min (add @nestjs/throttler in prod)
 *   - Audit trail:  every access logged with partial RUT and IP
 *   - HTTPS only:   enforced via helmet in production
 *
 * PRODUCTION SWAP:
 *   Replace InMemorySiiRepository with SiiApiProxyRepository:
 *   { provide: SII_REPOSITORY, useClass: SiiApiProxyRepository }
 *
 * ==========================================================================
 */
@Module({
  controllers: [SiiController],
  providers: [
    // Repository binding (hexagonal port → adapter)
    {
      provide: SII_REPOSITORY,
      useClass: InMemorySiiRepository,
    },

    // Use cases
    ValidateRutUseCase,
    AuthWithSIIUseCase,
    FetchFacturasUseCase,
    CalculateIVAUseCase,
  ],
  exports: [ValidateRutUseCase],
})
export class SiiModule {}
