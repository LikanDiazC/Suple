import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  ICrmRecordRepository,
  CrmRecordListQuery,
  CrmRecordListResult,
  DedupSearchHints,
} from '../../domain/repositories/ICrmRecordRepository';
import { CrmRecord, PropertySource, PropertyValue } from '../../domain/entities/CrmRecord';
import { CrmRecordOrmEntity } from './CrmRecordOrmEntity';
import { UniqueId } from '../../../../shared/kernel';

@Injectable()
export class TypeOrmCrmRecordRepository implements ICrmRecordRepository {
  constructor(
    @InjectRepository(CrmRecordOrmEntity)
    private readonly repo: Repository<CrmRecordOrmEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findById(_tenantId: string, recordId: string): Promise<CrmRecord | null> {
    const row = await this.dataSource.transaction(async (mgr) =>
      mgr.findOne(CrmRecordOrmEntity, { where: { id: recordId } }),
    );
    return row ? this.toDomain(row) : null;
  }

  async findByEmail(_tenantId: string, email: string): Promise<CrmRecord | null> {
    const row = await this.dataSource.transaction(async (mgr) =>
      mgr.findOne(CrmRecordOrmEntity, { where: { email: email.toLowerCase() } }),
    );
    return row ? this.toDomain(row) : null;
  }

  async findByDomain(_tenantId: string, domain: string): Promise<CrmRecord | null> {
    const row = await this.dataSource.transaction(async (mgr) =>
      mgr.findOne(CrmRecordOrmEntity, { where: { domain: domain.toLowerCase() } }),
    );
    return row ? this.toDomain(row) : null;
  }

  async list(query: CrmRecordListQuery): Promise<CrmRecordListResult> {
    return this.dataSource.transaction(async (mgr) => {
      const qb = mgr
        .createQueryBuilder(CrmRecordOrmEntity, 'r')
        .where('r.object_type = :ot AND r.archived = FALSE', { ot: query.objectType });

      if (query.search && query.search.trim()) {
        qb.andWhere(
          '(r.display_name ILIKE :s OR r.email ILIKE :s OR r.domain ILIKE :s OR r.properties::text ILIKE :s)',
          { s: `%${query.search.trim()}%` },
        );
      }

      if (query.ids && query.ids.length > 0) {
        qb.andWhere('r.id = ANY(:ids)', { ids: query.ids });
      }

      if (query.filters) {
        for (const [k, v] of Object.entries(query.filters)) {
          qb.andWhere(`r.properties ->> :k_${k} = :v_${k}`, { [`k_${k}`]: k, [`v_${k}`]: v });
        }
      }

      const sortColumn = this.toSortColumn(query.sortBy);
      qb.orderBy(sortColumn, query.sortOrder.toUpperCase() as 'ASC' | 'DESC')
        .skip((query.page - 1) * query.limit)
        .take(query.limit);

      const [rows, total] = await qb.getManyAndCount();
      return {
        records: rows.map((r) => this.toDomain(r)),
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      };
    });
  }

  async save(record: CrmRecord): Promise<void> {
    const props: Record<string, unknown> = {};
    record.properties.forEach((pv, k) => {
      props[k] = { value: pv.value, source: pv.source, updatedAt: pv.updatedAt, updatedBy: pv.updatedBy };
    });

    await this.dataSource.transaction(async (mgr) => {
      await mgr.upsert(
        CrmRecordOrmEntity,
        {
          id: record.id.toString(),
          tenantId: record.tenantId,
          objectType: record.objectType,
          properties: props,
          email: record.email ?? null,
          domain: record.domain ?? null,
          displayName: record.displayName,
          ownerId: record.ownerId ?? null,
          archived: record.archived,
          createdBy: (record as unknown as { props: { createdBy: string } }).props.createdBy,
          lastActivity: record.lastActivity ?? null,
          updatedAt: new Date(),
        } as object,
        ['id'],
      );
    });
  }

  async archive(_tenantId: string, recordId: string): Promise<void> {
    await this.dataSource.transaction((mgr) =>
      mgr.update(CrmRecordOrmEntity, { id: recordId }, { archived: true, updatedAt: new Date() }),
    );
  }

  async delete(_tenantId: string, recordId: string): Promise<void> {
    await this.dataSource.transaction((mgr) =>
      mgr.delete(CrmRecordOrmEntity, { id: recordId }),
    );
  }

  async findContactsByEmailDomain(tenantId: string, domain: string): Promise<CrmRecord[]> {
    return this.dataSource.transaction(async (mgr) => {
      const rows = await mgr
        .createQueryBuilder(CrmRecordOrmEntity, 'r')
        .where(
          "r.tenant_id = :tenantId AND r.object_type = 'contacts' AND r.archived = FALSE AND r.email LIKE :pattern",
          { tenantId, pattern: `%@${domain.toLowerCase()}` },
        )
        .getMany();
      return rows.map((r) => this.toDomain(r));
    });
  }

  async findCandidatesForDedup(
    _tenantId: string,
    objectType: string,
    email?: string,
    domain?: string,
    hints?: DedupSearchHints,
    maxCandidates = 50,
  ): Promise<CrmRecord[]> {
    return this.dataSource.transaction(async (mgr) => {
      const qb = mgr.createQueryBuilder(CrmRecordOrmEntity, 'r')
        .where('r.object_type = :ot AND r.archived = FALSE', { ot: objectType });

      const ors: string[] = [];
      if (email) { ors.push('r.email = :email'); qb.setParameter('email', email.toLowerCase()); }
      if (domain) { ors.push('r.domain = :domain'); qb.setParameter('domain', domain.toLowerCase()); }
      const fullName = [hints?.firstName, hints?.lastName].filter(Boolean).join(' ').trim();
      if (fullName.length >= 3) {
        const threshold = hints?.similarityThreshold ?? 0.3;
        ors.push(`similarity(r.display_name, :fname) > ${threshold}`);
        qb.setParameter('fname', fullName);
      }
      if (hints?.companyName && hints.companyName.length >= 3) {
        const threshold = hints?.similarityThreshold ?? 0.3;
        ors.push(`similarity(r.display_name, :cname) > ${threshold}`);
        qb.setParameter('cname', hints.companyName);
      }
      if (ors.length === 0) return [];
      qb.andWhere(`(${ors.join(' OR ')})`).limit(maxCandidates);

      const rows = await qb.getMany();
      return rows.map((r) => this.toDomain(r));
    });
  }

  private toSortColumn(sort: string): string {
    const map: Record<string, string> = {
      create_date: 'r.created_at',
      created_at: 'r.created_at',
      updated_at: 'r.updated_at',
      last_activity: 'r.last_activity',
      display_name: 'r.display_name',
      email: 'r.email',
    };
    return map[sort] ?? 'r.created_at';
  }

  private toDomain(row: CrmRecordOrmEntity): CrmRecord {
    const props = new Map<string, PropertyValue>();
    for (const [k, v] of Object.entries(row.properties ?? {})) {
      const pv = v as Partial<PropertyValue>;
      props.set(k, {
        value: pv?.value ?? v,
        source: (pv?.source as PropertySource) ?? PropertySource.MANUAL,
        updatedAt: pv?.updatedAt ? new Date(pv.updatedAt) : row.updatedAt,
        updatedBy: pv?.updatedBy ?? row.createdBy,
      });
    }
    return CrmRecord.rehydrate(UniqueId.from(row.id), row.tenantId, {
      objectDefinitionId: row.objectDefinitionId ?? '',
      objectType: row.objectType,
      properties: props,
      _email: row.email ?? undefined,
      _domain: row.domain ?? undefined,
      _name: row.displayName ?? undefined,
      _ownerId: row.ownerId ?? undefined,
      _lifecycleStage: row.lifecycleStage ?? undefined,
      _leadStatus: row.leadStatus ?? undefined,
      _createDate: row.createdAt,
      _lastActivity: row.lastActivity ?? undefined,
      archived: row.archived,
      createdBy: row.createdBy,
      updatedAt: row.updatedAt,
    });
  }
}
