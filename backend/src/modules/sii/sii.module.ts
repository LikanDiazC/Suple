import { Module } from '@nestjs/common';
import { SII_REPOSITORY }          from './domain/repositories/ISiiRepository';
import { BaseApiSiiRepository }    from './infrastructure/repositories/BaseApiSiiRepository';
import { ValidateRutUseCase }      from './application/use-cases/ValidateRut';
import { AuthWithSIIUseCase }      from './application/use-cases/AuthWithSII';
import { FetchFacturasUseCase }    from './application/use-cases/FetchFacturas';
import { CalculateIVAUseCase }     from './application/use-cases/CalculateIVA';
import { SiiController }           from './presentation/controllers/SiiController';

/**
 * SII Module — Chilean SII integration via BaseAPI.cl.
 * Requires BASEAPI_TOKEN env var. No InMemory fallback (rebuild Phase 6).
 */
@Module({
  controllers: [SiiController],
  providers: [
    { provide: SII_REPOSITORY, useClass: BaseApiSiiRepository },
    ValidateRutUseCase,
    AuthWithSIIUseCase,
    FetchFacturasUseCase,
    CalculateIVAUseCase,
  ],
  exports: [ValidateRutUseCase],
})
export class SiiModule {}
