import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CrmRecordOrmEntity,
  CrmAssociationOrmEntity,
  CrmObjectDefinitionOrmEntity,
} from './infrastructure/persistence/CrmRecordOrmEntity';
import { TypeOrmCrmRecordRepository } from './infrastructure/persistence/TypeOrmCrmRecordRepository';
import { TypeOrmContactRepository } from './infrastructure/persistence/TypeOrmContactRepository';
import { CRM_RECORD_REPOSITORY } from './domain/repositories/ICrmRecordRepository';
import { CONTACT_REPOSITORY } from './domain/repositories/IContactRepository';
import { ListCrmRecordsUseCase } from './application/use-cases/ListCrmRecords';
import { CreateCrmRecordUseCase } from './application/use-cases/CreateCrmRecord';
import { UpdateCrmRecordUseCase } from './application/use-cases/UpdateCrmRecord';
import { DeleteCrmRecordUseCase } from './application/use-cases/DeleteCrmRecord';
import { CreateContactUseCase } from './application/use-cases/CreateContact';
import { CrmRecordController } from './presentation/controllers/CrmRecordController';
import { ContactController } from './presentation/controllers/ContactController';
import { DealActivityController } from './presentation/controllers/DealActivityController';
import { DeduplicationService } from './domain/services/DeduplicationService';
import { EntityResolutionService } from './domain/services/EntityResolutionService';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CrmRecordOrmEntity,
      CrmAssociationOrmEntity,
      CrmObjectDefinitionOrmEntity,
    ]),
  ],
  controllers: [CrmRecordController, ContactController, DealActivityController],
  providers: [
    { provide: CRM_RECORD_REPOSITORY, useClass: TypeOrmCrmRecordRepository },
    { provide: CONTACT_REPOSITORY,   useClass: TypeOrmContactRepository },
    DeduplicationService,
    EntityResolutionService,
    ListCrmRecordsUseCase,
    CreateCrmRecordUseCase,
    UpdateCrmRecordUseCase,
    DeleteCrmRecordUseCase,
    CreateContactUseCase,
  ],
  exports: [CRM_RECORD_REPOSITORY, CONTACT_REPOSITORY],
})
export class CrmModule {}
