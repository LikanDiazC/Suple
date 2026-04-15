import { WorkOrder, WorkOrderStatus } from '../entities/WorkOrder';

export interface WorkOrderQuery {
  tenantId: string;
  status?:  WorkOrderStatus;
  page:     number;
  limit:    number;
}

export interface IWorkOrderRepository {
  findById(tenantId: string, id: string): Promise<WorkOrder | null>;
  list(query: WorkOrderQuery): Promise<{ items: WorkOrder[]; total: number }>;
  save(workOrder: WorkOrder): Promise<void>;
}

export const WORK_ORDER_REPOSITORY = Symbol('IWorkOrderRepository');
