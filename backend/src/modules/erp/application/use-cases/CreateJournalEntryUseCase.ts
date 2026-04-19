import { Inject, Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import {
  JOURNAL_ENTRY_REPOSITORY,
  IJournalEntryRepository,
} from '../../domain/repositories/IJournalEntryRepository';
import {
  JournalEntry,
  JournalEntrySource,
  JournalLineItem,
  LineItemType,
} from '../../domain/entities/JournalEntry';
import { Money } from '../../domain/value-objects/Money';

export interface CreateJournalEntryInput {
  tenantId: string;
  entryNumber: string;
  postingDate: Date;
  documentDate?: Date;
  currency: string;
  source: JournalEntrySource;
  description: string;
  createdBy: string;
  lineItems: Array<{
    accountCode: string;
    type: LineItemType;
    amountDecimal: number;
    description?: string;
    costCenter?: string;
    profitCenter?: string;
    businessPartner?: string;
    assetId?: string;
    dimensions?: Record<string, string>;
  }>;
}

@Injectable()
export class CreateJournalEntryUseCase {
  constructor(
    @Inject(JOURNAL_ENTRY_REPOSITORY)
    private readonly repo: IJournalEntryRepository,
  ) {}

  async execute(input: CreateJournalEntryInput): Promise<JournalEntry> {
    const existing = await this.repo.findByReference(input.tenantId, input.entryNumber);
    if (existing) throw new ConflictException(`Entry ${input.entryNumber} already exists`);

    const lineItems: JournalLineItem[] = [];
    let lineNumber = 1;
    for (const li of input.lineItems) {
      const moneyR = Money.fromDecimal(li.amountDecimal, input.currency);
      if (moneyR.isFail()) throw new BadRequestException(moneyR.error);
      lineItems.push({
        lineNumber: lineNumber++,
        accountCode: li.accountCode,
        type: li.type,
        amount: moneyR.value,
        description: li.description ?? '',
        costCenter: li.costCenter,
        profitCenter: li.profitCenter,
        businessPartner: li.businessPartner,
        assetId: li.assetId,
        dimensions: li.dimensions ?? {},
      });
    }

    const r = JournalEntry.create(input.tenantId, {
      entryNumber: input.entryNumber,
      fiscalYear: input.postingDate.getFullYear(),
      fiscalPeriod: input.postingDate.getMonth() + 1,
      postingDate: input.postingDate,
      documentDate: input.documentDate ?? input.postingDate,
      currency: input.currency,
      source: input.source,
      lineItems,
      description: input.description,
      createdBy: input.createdBy,
    });
    if (r.isFail()) throw new BadRequestException(r.error);

    await this.repo.save(r.value);
    return r.value;
  }
}
