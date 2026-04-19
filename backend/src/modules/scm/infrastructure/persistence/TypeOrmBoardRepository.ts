import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { IBoardRepository, BoardQuery } from '../../domain/repositories/IBoardRepository';
import { Board, BoardStatus } from '../../domain/entities/Board';
import { Dimensions } from '../../domain/value-objects/Dimensions';
import { MaterialSku } from '../../domain/value-objects/MaterialSku';
import { Thickness } from '../../domain/value-objects/Thickness';
import { BoardOrmEntity } from './BoardOrmEntity';

@Injectable()
export class TypeOrmBoardRepository implements IBoardRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findById(_tenantId: string, id: string): Promise<Board | null> {
    const row = await this.dataSource.transaction((mgr) =>
      mgr.findOne(BoardOrmEntity, { where: { id } }),
    );
    return row ? this.toDomain(row) : null;
  }

  async findByIds(_tenantId: string, ids: string[]): Promise<Board[]> {
    if (ids.length === 0) return [];
    const rows = await this.dataSource.transaction((mgr) =>
      mgr.find(BoardOrmEntity, { where: { id: In(ids) } }),
    );
    return rows.map((r) => this.toDomain(r));
  }

  async findAvailable(query: BoardQuery): Promise<Board[]> {
    return this.dataSource.transaction(async (mgr) => {
      const qb = mgr.createQueryBuilder(BoardOrmEntity, 'b');
      if (query.availableOnly) qb.andWhere('b.status = :s', { s: BoardStatus.AVAILABLE });
      if (query.materialSku) qb.andWhere('b.material_sku = :sku', { sku: query.materialSku.value });
      if (query.thickness) qb.andWhere('b.thickness_mm = :th', { th: query.thickness.mm });
      qb.orderBy('b.received_at', 'ASC');
      const rows = await qb.getMany();
      return rows.map((r) => this.toDomain(r));
    });
  }

  async save(board: Board): Promise<void> {
    await this.dataSource.transaction((mgr) => mgr.upsert(BoardOrmEntity, this.toOrm(board), ['id']));
  }

  async saveMany(boards: Board[]): Promise<void> {
    if (boards.length === 0) return;
    await this.dataSource.transaction((mgr) =>
      mgr.upsert(BoardOrmEntity, boards.map((b) => this.toOrm(b)), ['id']),
    );
  }

  private toDomain(row: BoardOrmEntity): Board {
    const sku = MaterialSku.create(row.materialSku).value;
    const th = Thickness.create(Number(row.thicknessMm)).value;
    const dim = Dimensions.create(row.widthMm, row.heightMm).value;
    return Board.reconstitute(row.id, row.tenantId, {
      materialSku: sku,
      thickness: th,
      dimensions: dim,
      status: row.status as BoardStatus,
      location: row.location,
      batchCode: row.batchCode,
      receivedAt: row.receivedAt,
      updatedAt: row.updatedAt,
      reservedByWorkOrderId: row.reservedByWorkOrderId,
    });
  }

  private toOrm(b: Board): Partial<BoardOrmEntity> {
    return {
      id: b.id.toString(),
      tenantId: b.tenantId,
      materialSku: b.materialSku.value,
      thicknessMm: String(b.thickness.mm),
      widthMm: b.dimensions.widthMm,
      heightMm: b.dimensions.heightMm,
      status: b.status,
      location: b.location,
      batchCode: b.batchCode,
      reservedByWorkOrderId: b.reservedByWorkOrderId,
      receivedAt: b.receivedAt,
      updatedAt: new Date(),
    };
  }
}
