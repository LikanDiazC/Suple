import { Module, Logger } from '@nestjs/common';
import { SII_REPOSITORY }          from './domain/repositories/ISiiRepository';
import { InMemorySiiRepository }   from './infrastructure/repositories/InMemorySiiRepository';
import { BaseApiSiiRepository }    from './infrastructure/repositories/BaseApiSiiRepository';
import { ValidateRutUseCase }      from './application/use-cases/ValidateRut';
import { AuthWithSIIUseCase }      from './application/use-cases/AuthWithSII';
import { FetchFacturasUseCase }    from './application/use-cases/FetchFacturas';
import { CalculateIVAUseCase }     from './application/use-cases/CalculateIVA';
import { SiiController }           from './presentation/controllers/SiiController';

const logger = new Logger('SiiModule');

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
 *   Infrastructure:  InMemorySiiRepository (dev) → BaseApiSiiRepository (prod)
 *   Presentation:    SiiController (rate-limited, audit-logged REST API)
 *
 * REPOSITORY SELECTION (automatic):
 *   - If BASEAPI_TOKEN is set → BaseApiSiiRepository (real SII via BaseAPI.cl)
 *   - Otherwise              → InMemorySiiRepository (mock data for dev)
 *
 * SECURITY POSTURE:
 *   - Credentials: never stored, never logged, only proxied via BaseAPI.cl
 *   - Sessions:    30-minute TTL, managed by SII (proxied)
 *   - Rate limiting: 5 auth attempts / 15 min (@nestjs/throttler)
 *   - Audit trail:  every access logged with partial RUT and IP
 *   - HTTPS only:   enforced via helmet in production
 *
 * ==========================================================================
 */
const siiRepositoryProvider = {
  provide: SII_REPOSITORY,
  useFactory: () => {
    if (process.env.BASEAPI_TOKEN) {
      logger.log(
        'BASEAPI_TOKEN detectado → usando BaseApiSiiRepository (SII real via BaseAPI.cl)',
      );
      return new BaseApiSiiRepository();
    }
    logger.log(
      'BASEAPI_TOKEN no configurado → usando InMemorySiiRepository (datos mock)',
    );
    return new InMemorySiiRepository();
  },
};

@Module({
  controllers: [SiiController],
  providers: [
    // Repository binding (hexagonal port → adapter, auto-selected)
    siiRepositoryProvider,

    // Use cases
    ValidateRutUseCase,
    AuthWithSIIUseCase,
    FetchFacturasUseCase,
    CalculateIVAUseCase,
  ],
  exports: [ValidateRutUseCase],
})
export class SiiModule {}
