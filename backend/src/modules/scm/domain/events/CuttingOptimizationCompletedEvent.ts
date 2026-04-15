import { DomainEvent } from '../../../../shared/kernel';

interface Payload {
  workOrderId:       string;
  productName:       string;
  efficiencyPercent: number;
  boardsUsed:        number;
  offcutsGenerated:  number;
  unplacedPieceIds:  string[];
  svgLayout:         string;
}

export class CuttingOptimizationCompletedEvent extends DomainEvent {
  private readonly _payload: Payload;

  constructor(tenantId: string, payload: Payload) {
    super(tenantId);
    this._payload = payload;
  }

  get eventName(): string {
    return 'scm.workorder.cutting_optimization_completed';
  }

  toPayload(): Record<string, unknown> {
    return {
      ...super.toPayload(),
      ...this._payload,
    };
  }

  get workOrderId():       string   { return this._payload.workOrderId; }
  get efficiencyPercent(): number   { return this._payload.efficiencyPercent; }
  get unplacedPieceIds():  string[] { return this._payload.unplacedPieceIds; }
}
