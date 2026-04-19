import {
  Controller, Get, Post, Body, Param, Query, Req, Inject,
  HttpCode, HttpStatus, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { resolveTenantId } from '../../../../shared/helpers/resolveTenantId';
import {
  IJournalEntryRepository, JOURNAL_ENTRY_REPOSITORY,
} from '../../domain/repositories/IJournalEntryRepository';
import { CreateJournalEntryUseCase, CreateJournalEntryInput } from '../../application/use-cases/CreateJournalEntryUseCase';
import { JournalEntry, JournalEntrySource, LineItemType } from '../../domain/entities/JournalEntry';

interface CreateJournalDto {
  entryNumber: string;
  postingDate: string;
  documentDate?: string;
  currency: string;
  source: JournalEntrySource;
  description: string;
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

function serialize(e: JournalEntry) {
  return {
    id: e.id.toString(),
    tenantId: e.tenantId,
    entryNumber: e.entryNumber,
    status: e.status,
    source: e.source,
    postingDate: e.postingDate,
    totalDebits: e.totalDebits,
    totalCredits: e.totalCredits,
    lineItems: e.lineItems.map((li) => ({
      lineNumber: li.lineNumber,
      accountCode: li.accountCode,
      type: li.type,
      amount: li.amount.decimal,
      currency: li.amount.currency,
      description: li.description,
      costCenter: li.costCenter ?? null,
      profitCenter: li.profitCenter ?? null,
      businessPartner: li.businessPartner ?? null,
      assetId: li.assetId ?? null,
      dimensions: li.dimensions,
    })),
  };
}

@Controller('api/erp/journal')
export class JournalController {
  constructor(
    @Inject(JOURNAL_ENTRY_REPOSITORY) private readonly repo: IJournalEntryRepository,
    private readonly createUC: CreateJournalEntryUseCase,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok', module: 'ERP', timestamp: new Date().toISOString() };
  }

  @Get()
  async list(
    @Req() req: Request,
    @Query('fiscalYear') fy?: string,
    @Query('fiscalPeriod') fp?: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const tenantId = resolveTenantId(req);
    const { items, total } = await this.repo.list({
      tenantId,
      fiscalYear: fy ? Number(fy) : undefined,
      fiscalPeriod: fp ? Number(fp) : undefined,
      status,
      page: Math.max(1, parseInt(page) || 1),
      limit: Math.min(100, parseInt(limit) || 20),
    });
    return { items: items.map(serialize), total };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: Request, @Body() dto: CreateJournalDto) {
    const tenantId = resolveTenantId(req);
    const userId = req.authenticatedUser?.userId ?? '';
    const input: CreateJournalEntryInput = {
      tenantId,
      entryNumber: dto.entryNumber,
      postingDate: new Date(dto.postingDate),
      documentDate: dto.documentDate ? new Date(dto.documentDate) : undefined,
      currency: dto.currency,
      source: dto.source,
      description: dto.description,
      createdBy: userId,
      lineItems: dto.lineItems,
    };
    const e = await this.createUC.execute(input);
    return serialize(e);
  }

  @Get(':id')
  async getOne(@Req() req: Request, @Param('id') id: string) {
    const tenantId = resolveTenantId(req);
    const e = await this.repo.findById(tenantId, id);
    if (!e) throw new NotFoundException(`Journal entry ${id} not found`);
    return serialize(e);
  }

  @Post(':id/post')
  @HttpCode(HttpStatus.OK)
  async post(@Req() req: Request, @Param('id') id: string) {
    const tenantId = resolveTenantId(req);
    const e = await this.repo.findById(tenantId, id);
    if (!e) throw new NotFoundException(`Journal entry ${id} not found`);
    try {
      // DB trigger enforce_journal_balance is the second barrier (Directive 5).
      await this.repo.post(tenantId, id);
    } catch (err) {
      throw new BadRequestException(`Cannot post entry: ${(err as Error).message}`);
    }
    const updated = await this.repo.findById(tenantId, id);
    return updated ? serialize(updated) : { id, status: 'POSTED' };
  }
}
