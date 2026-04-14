import { Module } from '@nestjs/common';
import { CRM_RECORD_REPOSITORY } from './domain/repositories/ICrmRecordRepository';
import { InMemoryCrmRecordRepository } from './infrastructure/repositories/InMemoryCrmRecordRepository';
import { ListCrmRecordsUseCase } from './application/use-cases/ListCrmRecords';
import { CreateCrmRecordUseCase } from './application/use-cases/CreateCrmRecord';
import { UpdateCrmRecordUseCase } from './application/use-cases/UpdateCrmRecord';
import { DeleteCrmRecordUseCase } from './application/use-cases/DeleteCrmRecord';
import { CrmRecordController } from './presentation/controllers/CrmRecordController';

/**
 * ==========================================================================
 * CRM Module (NestJS)
 * ==========================================================================
 *
 * Registers all CRM domain services, use cases, and infrastructure.
 *
 * Repository binding:
 *   CRM_RECORD_REPOSITORY → InMemoryCrmRecordRepository (dev)
 *   In production, swap to PostgresCrmRecordRepository
 *
 * ==========================================================================
 */
@Module({
  controllers: [CrmRecordController],
  providers: [
    // --- Repository (Hexagonal port → adapter binding) ---
    {
      provide: CRM_RECORD_REPOSITORY,
      useClass: InMemoryCrmRecordRepository,
    },

    // --- Use Cases ---
    ListCrmRecordsUseCase,
    CreateCrmRecordUseCase,
    UpdateCrmRecordUseCase,
    DeleteCrmRecordUseCase,
  ],
  exports: [CRM_RECORD_REPOSITORY],
})
export class CrmModule {}
