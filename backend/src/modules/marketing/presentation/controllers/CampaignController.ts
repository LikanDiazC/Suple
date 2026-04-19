import {
  Controller, Get, Post, Body, Param, Req, Query,
  HttpCode, HttpStatus, NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { resolveTenantId } from '../../../../shared/helpers/resolveTenantId';
import { CampaignOrmEntity, CampaignChannel } from '../../infrastructure/persistence/CampaignOrmEntity';

interface CreateCampaignDto {
  name: string;
  channel: CampaignChannel;
  audience?: Record<string, unknown>;
  content?: Record<string, unknown>;
  scheduledAt?: string;
}

@Controller('api/marketing/campaigns')
export class CampaignController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  @Get('health')
  health() {
    return { status: 'ok', module: 'Marketing', timestamp: new Date().toISOString() };
  }

  @Get()
  async list(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    resolveTenantId(req);
    return this.ds.transaction(async (mgr) => {
      const qb = mgr.createQueryBuilder(CampaignOrmEntity, 'c');
      if (status) qb.andWhere('c.status = :s', { s: status });
      if (channel) qb.andWhere('c.channel = :ch', { ch: channel });
      qb.orderBy('c.created_at', 'DESC')
        .skip((Math.max(1, parseInt(page) || 1) - 1) * (parseInt(limit) || 20))
        .take(Math.min(100, parseInt(limit) || 20));
      const [items, total] = await qb.getManyAndCount();
      return { items, total };
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: Request, @Body() dto: CreateCampaignDto) {
    const tenantId = resolveTenantId(req);
    const userId = req.authenticatedUser?.userId ?? '';
    return this.ds.transaction(async (mgr) => {
      const entity = mgr.create(CampaignOrmEntity, {
        tenantId,
        name: dto.name,
        channel: dto.channel,
        status: 'DRAFT',
        audience: dto.audience ?? {},
        content: dto.content ?? {},
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        startedAt: null,
        completedAt: null,
        createdBy: userId,
      });
      return mgr.save(CampaignOrmEntity, entity);
    });
  }

  @Get(':id')
  async getOne(@Req() req: Request, @Param('id') id: string) {
    resolveTenantId(req);
    const row = await this.ds.transaction((mgr) =>
      mgr.findOne(CampaignOrmEntity, { where: { id } }),
    );
    if (!row) throw new NotFoundException(`Campaign ${id} not found`);
    return row;
  }
}
