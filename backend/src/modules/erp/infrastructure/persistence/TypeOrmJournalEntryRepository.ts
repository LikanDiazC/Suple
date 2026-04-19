import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  IJournalEntryRepository,
  JournalListQuery,
} from '../../domain/repositories/IJournalEntryRepository';
import {
  JournalEntry,
  JournalEntryStatus,
  JournalEntrySource,
  JournalLineItem,
  LineItemType,
} from '../../domain/entities/JournalEntry';
import { Money } from '../../domain/value-objects/Money';
import { JournalEntryOrmEntity, JournalLineItemOrmEntity } from './JournalEntryOrmEntity';

@Injectable()
export class TypeOrmJournalEntryRepository implements IJournalEntryRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findById(_tenantId: string, id: string): Promise<JournalEntry | null> {
    const row = await this.dataSource.transaction((mgr) =>
      mgr.findOne(JournalEntryOrmEntity, { where: { id }, relations: ['lineItems'] }),
    );
    return row ? this.toDomain(row) : null;
  }

  async findByReference(_tenantId: string, reference: string): Promise<JournalEntry | null> {
    const row = await this.dataSource.transaction((mgr) =>
      mgr.findOne(JournalEntryOrmEntity, { where: { reference }, relations: ['lineItems'] }),
    );
    return row ? this.toDomain(row) : null;
  }

  async list(query: JournalListQuery): Promise<{ items: JournalEntry[]; total: number }> {
    return this.dataSource.transaction(async (mgr) => {
      const qb = mgr.createQueryBuilder(JournalEntryOrmEntity, 'e').leftJoinAndSelect('e.lineItems', 'li');
      if (query.fiscalYear) qb.andWhere('e.fiscal_year = :y', { y: query.fiscalYear });
      if (query.fiscalPeriod) qb.andWhere('e.fiscal_period = :p', { p: query.fiscalPeriod });
      if (query.status) qb.andWhere('e.status = :s', { s: query.status });
      qb.orderBy('e.entry_date', 'DESC')
        .skip((query.page - 1) * query.limit)
        .take(query.limit);
      const [rows, total] = await qb.getManyAndCount();
      return { items: rows.map((r) => this.toDomain(r)), total };
    });
  }

  async save(entry: JournalEntry): Promise<void> {
    const orm = this.toOrm(entry);
    await this.dataSource.transaction(async (mgr) => {
      // Strategy: insert/update entry header, then re-insert line items if DRAFT.
      // Posted entries are immutable per DB trigger (protect_posted_journal_lines).
      await mgr.upsert(
        JournalEntryOrmEntity,
        {
          id: orm.id,
          tenantId: orm.tenantId,
          reference: orm.reference,
          description: orm.description,
          entryDate: orm.entryDate,
          documentDate: orm.documentDate,
          fiscalYear: orm.fiscalYear,
          fiscalPeriod: orm.fiscalPeriod,
          currency: orm.currency,
          source: orm.source,
          status: orm.status,
          createdBy: orm.createdBy,
          createdAt: orm.createdAt,
        },
        ['id'],
      );

      if (orm.status === JournalEntryStatus.DRAFT) {
        await mgr.delete(JournalLineItemOrmEntity, { entry: { id: orm.id } });
        for (const li of orm.lineItems) {
          await mgr.insert(JournalLineItemOrmEntity, { ...li, entry: { id: orm.id } as JournalEntryOrmEntity });
        }
      }
    });
  }

  async post(_tenantId: string, id: string): Promise<void> {
    // Trigger enforce_journal_balance fires here (Directive 5).
    await this.dataSource.transaction((mgr) =>
      mgr.update(JournalEntryOrmEntity, { id }, { status: JournalEntryStatus.POSTED }),
    );
  }

  private toDomain(row: JournalEntryOrmEntity): JournalEntry {
    const lineItems: JournalLineItem[] = (row.lineItems ?? []).map((li, idx) => ({
      lineNumber: li.lineNumber ?? idx + 1,
      accountCode: li.accountCode,
      costCenter: li.costCenter ?? undefined,
      profitCenter: li.profitCenter ?? undefined,
      businessPartner: li.businessPartner ?? undefined,
      assetId: li.assetId ?? undefined,
      amount: Money.fromCents(Number(li.amountCents), li.currency).value,
      type: li.type as LineItemType,
      description: li.memo ?? '',
      dimensions: li.dimensions ?? {},
    }));

    return JournalEntry.reconstitute(row.id, row.tenantId, {
      entryNumber: row.reference,
      fiscalYear: row.fiscalYear ?? row.entryDate.getFullYear(),
      fiscalPeriod: row.fiscalPeriod ?? row.entryDate.getMonth() + 1,
      postingDate: row.entryDate,
      documentDate: row.documentDate ?? row.entryDate,
      currency: row.currency,
      source: row.source as JournalEntrySource,
      status: row.status as JournalEntryStatus,
      lineItems,
      description: row.description ?? '',
      reversalOfEntryId: row.reversalOfEntryId ?? undefined,
      createdBy: row.createdBy ?? '',
      createdAt: row.createdAt,
    });
  }

  private toOrm(e: JournalEntry): JournalEntryOrmEntity & { lineItems: JournalLineItemOrmEntity[] } {
    const props = (e as unknown as { props: {
      entryNumber: string;
      fiscalYear: number;
      fiscalPeriod: number;
      postingDate: Date;
      documentDate: Date;
      currency: string;
      source: JournalEntrySource;
      status: JournalEntryStatus;
      lineItems: JournalLineItem[];
      description: string;
      reversalOfEntryId?: string;
      createdBy: string;
      createdAt: Date;
    } }).props;

    const lineItems = props.lineItems.map((li) => ({
      tenantId: e.tenantId,
      lineNumber: li.lineNumber,
      accountCode: li.accountCode,
      type: li.type,
      amountCents: String(li.amount.cents),
      currency: li.amount.currency,
      costCenter: li.costCenter ?? null,
      profitCenter: li.profitCenter ?? null,
      businessPartner: li.businessPartner ?? null,
      assetId: li.assetId ?? null,
      memo: li.description,
      dimensions: li.dimensions ?? {},
    })) as unknown as JournalLineItemOrmEntity[];

    return {
      id: e.id.toString(),
      tenantId: e.tenantId,
      reference: props.entryNumber,
      description: props.description,
      entryDate: props.postingDate,
      documentDate: props.documentDate,
      fiscalYear: props.fiscalYear,
      fiscalPeriod: props.fiscalPeriod,
      currency: props.currency,
      source: props.source,
      status: props.status,
      reversalOfEntryId: props.reversalOfEntryId ?? null,
      createdBy: props.createdBy || null,
      postedAt: null,
      createdAt: props.createdAt,
      lineItems,
    } as JournalEntryOrmEntity & { lineItems: JournalLineItemOrmEntity[] };
  }
}
