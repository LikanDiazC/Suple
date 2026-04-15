import { Injectable } from '@nestjs/common';
import { WorkOrder } from '../../domain/entities/WorkOrder';
import { IWorkOrderRepository, WorkOrderQuery } from '../../domain/repositories/IWorkOrderRepository';

@Injectable()
export class InMemoryWorkOrderRepository implements IWorkOrderRepository {
  private readonly store = new Map<string, WorkOrder>();

  async findById(tenantId: string, id: string): Promise<WorkOrder | null> {
    const wo = this.store.get(id);
    return wo?.tenantId === tenantId ? wo : null;
  }

  async list(query: WorkOrderQuery): Promise<{ items: WorkOrder[]; total: number }> {
    let items = [...this.store.values()].filter(wo => {
      if (wo.tenantId !== query.tenantId) return false;
      if (query.status  && wo.status !== query.status) return false;
      return true;
    });

    const total = items.length;
    const start = (query.page - 1) * query.limit;
    items = items.slice(start, start + query.limit);

    return { items, total };
  }

  async save(workOrder: WorkOrder): Promise<void> {
    this.store.set(workOrder.id.toString(), workOrder);
  }
}
