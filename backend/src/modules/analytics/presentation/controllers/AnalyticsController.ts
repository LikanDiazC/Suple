import {
  Controller, Get, Post, Body, Req, Query,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { resolveTenantId } from '../../../../shared/helpers/resolveTenantId';
import { AnalyticsEventOrmEntity } from '../../infrastructure/persistence/AnalyticsEventOrmEntity';

interface TrackEventDto {
  eventName: string;
  entityType?: string;
  entityId?: string;
  properties?: Record<string, unknown>;
}

@Controller('api/analytics')
export class AnalyticsController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  @Get('health')
  health() {
    return { status: 'ok', module: 'Analytics', timestamp: new Date().toISOString() };
  }

  @Post('events')
  @HttpCode(HttpStatus.ACCEPTED)
  async track(@Req() req: Request, @Body() dto: TrackEventDto) {
    const tenantId = resolveTenantId(req);
    const userId = req.authenticatedUser?.userId ?? null;
    await this.ds.transaction((mgr) =>
      mgr.insert(AnalyticsEventOrmEntity, {
        tenantId,
        eventName: dto.eventName,
        userId,
        entityType: dto.entityType ?? null,
        entityId: dto.entityId ?? null,
        properties: (dto.properties ?? {}) as object,
      } as object),
    );
    return { accepted: true };
  }

  @Get('summary')
  async summary(
    @Req() req: Request,
    @Query('eventName') eventName?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    resolveTenantId(req);
    return this.ds.transaction(async (mgr) => {
      const qb = mgr.createQueryBuilder(AnalyticsEventOrmEntity, 'e')
        .select('e.event_name', 'eventName')
        .addSelect('COUNT(*)::int', 'count')
        .groupBy('e.event_name');
      if (eventName) qb.andWhere('e.event_name = :n', { n: eventName });
      if (from) qb.andWhere('e.occurred_at >= :f', { f: new Date(from) });
      if (to) qb.andWhere('e.occurred_at <= :t', { t: new Date(to) });
      return qb.getRawMany();
    });
  }
}
