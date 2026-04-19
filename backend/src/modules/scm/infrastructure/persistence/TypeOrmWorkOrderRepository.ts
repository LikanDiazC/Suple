import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  IWorkOrderRepository,
  WorkOrderQuery,
} from '../../domain/repositories/IWorkOrderRepository';
import {
  WorkOrder,
  WorkOrderStatus,
  CuttingRequirement,
  CuttingPlan,
} from '../../domain/entities/WorkOrder';
import { Dimensions } from '../../domain/value-objects/Dimensions';
import { MaterialSku } from '../../domain/value-objects/MaterialSku';
import { WorkOrderOrmEntity } from './WorkOrderOrmEntity';

interface SerializedRequirement {
  id: string;
  materialSku: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  label: string;
}

@Injectable()
export class TypeOrmWorkOrderRepository implements IWorkOrderRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findById(_tenantId: string, id: string): Promise<WorkOrder | null> {
    const row = await this.dataSource.transaction((mgr) =>
      mgr.findOne(WorkOrderOrmEntity, { where: { id } }),
    );
    return row ? this.toDomain(row) : null;
  }

  async list(query: WorkOrderQuery): Promise<{ items: WorkOrder[]; total: number }> {
    return this.dataSource.transaction(async (mgr) => {
      const qb = mgr.createQueryBuilder(WorkOrderOrmEntity, 'w');
      if (query.status) qb.andWhere('w.status = :s', { s: query.status });
      qb.orderBy('w.created_at', 'DESC')
        .skip((query.page - 1) * query.limit)
        .take(query.limit);
      const [rows, total] = await qb.getManyAndCount();
      return { items: rows.map((r) => this.toDomain(r)), total };
    });
  }

  async save(workOrder: WorkOrder): Promise<void> {
    await this.dataSource.transaction((mgr) =>
      mgr.upsert(WorkOrderOrmEntity, this.toOrm(workOrder) as object, ['id']),
    );
  }

  private toDomain(row: WorkOrderOrmEntity): WorkOrder {
    const reqs: CuttingRequirement[] = (row.requirements as SerializedRequirement[]).map((r) => ({
      id: r.id,
      materialSku: MaterialSku.create(r.materialSku).value,
      dimensions: Dimensions.create(r.widthMm, r.heightMm).value,
      quantity: r.quantity,
      label: r.label,
    }));

    const plan: CuttingPlan | null = row.cuttingPlan
      ? (() => {
          const p = row.cuttingPlan as Omit<CuttingPlan, 'computedAt'> & { computedAt: string };
          return { ...p, computedAt: new Date(p.computedAt) };
        })()
      : null;

    return WorkOrder.reconstitute(row.id, row.tenantId, {
      productName: row.productName,
      requirements: reqs,
      status: row.status as WorkOrderStatus,
      cuttingPlan: plan,
      reservedStockIds: row.reservedStockIds,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt,
    });
  }

  private toOrm(w: WorkOrder): Partial<WorkOrderOrmEntity> {
    const reqs: SerializedRequirement[] = w.requirements.map((r) => ({
      id: r.id,
      materialSku: r.materialSku.value,
      widthMm: r.dimensions.widthMm,
      heightMm: r.dimensions.heightMm,
      quantity: r.quantity,
      label: r.label,
    }));
    return {
      id: w.id.toString(),
      tenantId: w.tenantId,
      productName: w.productName,
      status: w.status,
      requirements: reqs,
      cuttingPlan: w.cuttingPlan as Record<string, unknown> | null,
      reservedStockIds: w.reservedStockIds,
      createdAt: w.createdAt,
      updatedAt: new Date(),
      completedAt: w.completedAt,
    };
  }
}
