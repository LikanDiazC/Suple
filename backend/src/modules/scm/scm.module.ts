import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BOARD_REPOSITORY }      from './domain/repositories/IBoardRepository';
import { OFFCUT_REPOSITORY }     from './domain/repositories/IOffcutRepository';
import { WORK_ORDER_REPOSITORY } from './domain/repositories/IWorkOrderRepository';
import { CUTTING_ENGINE_PORT }   from './domain/ports/ICuttingEnginePort';
import { BoardOrmEntity }     from './infrastructure/persistence/BoardOrmEntity';
import { OffcutOrmEntity }    from './infrastructure/persistence/OffcutOrmEntity';
import { WorkOrderOrmEntity } from './infrastructure/persistence/WorkOrderOrmEntity';
import { TypeOrmBoardRepository }     from './infrastructure/persistence/TypeOrmBoardRepository';
import { TypeOrmOffcutRepository }    from './infrastructure/persistence/TypeOrmOffcutRepository';
import { TypeOrmWorkOrderRepository } from './infrastructure/persistence/TypeOrmWorkOrderRepository';
import { HttpCuttingEngineAdapter }   from './infrastructure/clients/HttpCuttingEngineAdapter';
import { ExecuteCuttingOptimizationUseCase } from './application/use-cases/ExecuteCuttingOptimization';
import { ScmController } from './presentation/controllers/ScmController';

@Module({
  imports: [TypeOrmModule.forFeature([BoardOrmEntity, OffcutOrmEntity, WorkOrderOrmEntity])],
  controllers: [ScmController],
  providers: [
    { provide: BOARD_REPOSITORY,      useClass: TypeOrmBoardRepository },
    { provide: OFFCUT_REPOSITORY,     useClass: TypeOrmOffcutRepository },
    { provide: WORK_ORDER_REPOSITORY, useClass: TypeOrmWorkOrderRepository },
    { provide: CUTTING_ENGINE_PORT, useFactory: () => new HttpCuttingEngineAdapter() },
    ExecuteCuttingOptimizationUseCase,
  ],
  exports: [ExecuteCuttingOptimizationUseCase, BOARD_REPOSITORY, OFFCUT_REPOSITORY, WORK_ORDER_REPOSITORY],
})
export class ScmModule {}
