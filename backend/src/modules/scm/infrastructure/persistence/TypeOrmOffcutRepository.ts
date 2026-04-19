import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { IOffcutRepository, OffcutQuery } from '../../domain/repositories/IOffcutRepository';
import { Offcut, OffcutStatus } from '../../domain/entities/Offcut';
import { Dimensions } from '../../domain/value-objects/Dimensions';
import { MaterialSku } from '../../domain/value-objects/MaterialSku';
import { Thickness } from '../../domain/value-objects/Thickness';
import { OffcutOrmEntity } from './OffcutOrmEntity';

@Injectable()
export class TypeOrmOffcutRepository implements IOffcutRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findById(_tenantId: string, id: string): Promise<Offcut | null> {
    const row = await this.dataSource.transaction((mgr) =>
      mgr.findOne(OffcutOrmEntity, { where: { id } }),
    );
    return row ? this.toDomain(row) : null;
  }

  async findByIds(_tenantId: string, ids: string[]): Promise<Offcut[]> {
    if (ids.length === 0) return [];
    const rows = await this.dataSource.transaction((mgr) =>
      mgr.find(OffcutOrmEntity, { where: { id: In(ids) } }),
    );
    return rows.map((r) => this.toDomain(r));
  }

  async findAvailable(query: OffcutQuery): Promise<Offcut[]> {
    return this.dataSource.transaction(async (mgr) => {
      const qb = mgr.createQueryBuilder(OffcutOrmEntity, 'o');
      if (query.availableOnly) qb.andWhere('o.status = :s', { s: OffcutStatus.AVAILABLE });
      if (query.materialSku) qb.andWhere('o.material_sku = :sku', { sku: query.materialSku.value });
      if (query.thickness) qb.andWhere('o.thickness_mm = :th', { th: query.thickness.mm });
      if (query.minWidthMm) qb.andWhere('o.width_mm >= :mw', { mw: query.minWidthMm });
      if (query.minHeightMm) qb.andWhere('o.height_mm >= :mh', { mh: query.minHeightMm });
      qb.orderBy('o.created_at', 'ASC');
      const rows = await qb.getMany();
      return rows.map((r) => this.toDomain(r));
    });
  }

  async save(offcut: Offcut): Promise<void> {
    await this.dataSource.transaction((mgr) => mgr.upsert(OffcutOrmEntity, this.toOrm(offcut), ['id']));
  }

  async saveMany(offcuts: Offcut[]): Promise<void> {
    if (offcuts.length === 0) return;
    await this.dataSource.transaction((mgr) =>
      mgr.upsert(OffcutOrmEntity, offcuts.map((o) => this.toOrm(o)), ['id']),
    );
  }

  /** DB enum stores SCRAPPED, domain enum uses DISCARDED. */
  private statusToDb(s: OffcutStatus): string {
    return s === OffcutStatus.DISCARDED ? 'SCRAPPED' : s;
  }
  private statusFromDb(s: string): OffcutStatus {
    return s === 'SCRAPPED' ? OffcutStatus.DISCARDED : (s as OffcutStatus);
  }

  private toDomain(row: OffcutOrmEntity): Offcut {
    const sku = MaterialSku.create(row.materialSku).value;
    const th = Thickness.create(Number(row.thicknessMm)).value;
    const dim = Dimensions.create(row.widthMm, row.heightMm).value;
    return Offcut.reconstitute(row.id, row.tenantId, {
      materialSku: sku,
      thickness: th,
      dimensions: dim,
      status: this.statusFromDb(row.status),
      sourceBoardId: row.sourceBoardId ?? '',
      sourceWorkOrderId: row.sourceWorkOrderId ?? '',
      location: null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      reservedByWorkOrderId: row.reservedByWorkOrderId,
    });
  }

  private toOrm(o: Offcut): Partial<OffcutOrmEntity> {
    return {
      id: o.id.toString(),
      tenantId: o.tenantId,
      sourceBoardId: o.sourceBoardId || null,
      sourceWorkOrderId: o.sourceWorkOrderId || null,
      materialSku: o.materialSku.value,
      thicknessMm: String(o.thickness.mm),
      widthMm: o.dimensions.widthMm,
      heightMm: o.dimensions.heightMm,
      status: this.statusToDb(o.status),
      reservedByWorkOrderId: o.reservedByWorkOrderId,
      createdAt: (o as unknown as { props: { createdAt: Date } }).props.createdAt,
      updatedAt: new Date(),
    };
  }
}
