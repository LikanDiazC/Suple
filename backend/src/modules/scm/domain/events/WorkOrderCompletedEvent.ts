import { DomainEvent } from '../../../../shared/kernel';
import { BoardAllocation } from '../entities/WorkOrder';

interface Payload {
  workOrderId:      string;
  productName:      string;
  reservedStockIds: string[];
  boardAllocations: BoardAllocation[];
}

/**
 * Consumed by InventoryTransactionHandler to:
 *   1. Mark boards/offcuts as CONSUMED
 *   2. Persist new Offcut entities from PlannedOffcut[]
 */
export class WorkOrderCompletedEvent extends DomainEvent {
  private readonly _payload: Payload;

  constructor(tenantId: string, payload: Payload) {
    super(tenantId);
    this._payload = payload;
  }

  get eventName(): string {
    return 'scm.workorder.completed';
  }

  toPayload(): Record<string, unknown> {
    return {
      ...super.toPayload(),
      ...this._payload,
    };
  }

  get workOrderId():      string            { return this._payload.workOrderId; }
  get reservedStockIds(): string[]          { return this._payload.reservedStockIds; }
  get boardAllocations(): BoardAllocation[] { return this._payload.boardAllocations; }
}
