import { Injectable } from '@nestjs/common';
import { WorkOrder } from '../../domain/entities/WorkOrder';
import { IWorkOrderRepository, WorkOrderQuery } from '../../domain/repositories/IWorkOrderRepository';
import { BaseInMemoryRepository } from '../../../../shared/infrastructure/BaseInMemoryRepository';

@Injectable()
export class InMemoryWorkOrderRepository
  extends BaseInMemoryRepository<WorkOrder>
  implements IWorkOrderRepository
{
  async list(query: WorkOrderQuery): Promise<{ items: WorkOrder[]; total: number }> {
    const filtered = this.allForTenant(query.tenantId).filter((wo) => {
      if (query.status && wo.status !== query.status) return false;
      return true;
    });

    return this.paginate(filtered, query.page, query.limit);
  }
}
