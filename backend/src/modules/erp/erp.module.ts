import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JOURNAL_ENTRY_REPOSITORY } from './domain/repositories/IJournalEntryRepository';
import { JournalEntryOrmEntity, JournalLineItemOrmEntity } from './infrastructure/persistence/JournalEntryOrmEntity';
import { TypeOrmJournalEntryRepository } from './infrastructure/persistence/TypeOrmJournalEntryRepository';
import { CreateJournalEntryUseCase } from './application/use-cases/CreateJournalEntryUseCase';
import { JournalController } from './presentation/controllers/JournalController';
import { OrdersController } from './presentation/controllers/OrdersController';
import { FurnitureCatalogController } from './presentation/controllers/FurnitureCatalogController';

@Module({
  imports: [TypeOrmModule.forFeature([JournalEntryOrmEntity, JournalLineItemOrmEntity])],
  controllers: [JournalController, OrdersController, FurnitureCatalogController],
  providers: [
    { provide: JOURNAL_ENTRY_REPOSITORY, useClass: TypeOrmJournalEntryRepository },
    CreateJournalEntryUseCase,
  ],
  exports: [JOURNAL_ENTRY_REPOSITORY, CreateJournalEntryUseCase],
})
export class ErpModule {}
