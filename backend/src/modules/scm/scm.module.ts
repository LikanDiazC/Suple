import { Module } from '@nestjs/common';
import { BOARD_REPOSITORY }      from './domain/repositories/IBoardRepository';
import { OFFCUT_REPOSITORY }     from './domain/repositories/IOffcutRepository';
import { WORK_ORDER_REPOSITORY } from './domain/repositories/IWorkOrderRepository';
import { CUTTING_ENGINE_PORT }   from './domain/ports/ICuttingEnginePort';
import { InMemoryBoardRepository }     from './infrastructure/repositories/InMemoryBoardRepository';
import { InMemoryOffcutRepository }    from './infrastructure/repositories/InMemoryOffcutRepository';
import { InMemoryWorkOrderRepository } from './infrastructure/repositories/InMemoryWorkOrderRepository';
import { HttpCuttingEngineAdapter }    from './infrastructure/clients/HttpCuttingEngineAdapter';
import { ExecuteCuttingOptimizationUseCase } from './application/use-cases/ExecuteCuttingOptimization';
import { ScmController } from './presentation/controllers/ScmController';

@Module({
  controllers: [ScmController],
  providers: [
    // ── Repositories (swap InMemory → TypeORM in production) ─────────────────
    { provide: BOARD_REPOSITORY,      useClass: InMemoryBoardRepository },
    { provide: OFFCUT_REPOSITORY,     useClass: InMemoryOffcutRepository },
    { provide: WORK_ORDER_REPOSITORY, useClass: InMemoryWorkOrderRepository },

    // ── Cutting Engine Port ───────────────────────────────────────────────────
    // Swap to a MockCuttingEngineAdapter when CUTTING_ENGINE_URL is not set (CI/CD)
    {
      provide:    CUTTING_ENGINE_PORT,
      useFactory: () => new HttpCuttingEngineAdapter(),
    },

    // ── Use Cases ─────────────────────────────────────────────────────────────
    // EventBus is injected automatically via @Global() InfrastructureModule
    ExecuteCuttingOptimizationUseCase,
  ],
  exports: [
    ExecuteCuttingOptimizationUseCase,
    BOARD_REPOSITORY,
    OFFCUT_REPOSITORY,
    WORK_ORDER_REPOSITORY,
  ],
})
export class ScmModule {}
