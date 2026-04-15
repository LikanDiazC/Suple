import { DomainEvent } from '../../../../shared/kernel/DomainEvent';

export class ProcessInstanceCancelledEvent extends DomainEvent {
  static readonly EVENT_NAME = 'bpms.instance.cancelled';

  constructor(
    tenantId: string,
    public readonly instanceId: string,
    public readonly definitionId: string,
    public readonly reason: string,
  ) {
    super(tenantId);
  }

  get eventName(): string {
    return ProcessInstanceCancelledEvent.EVENT_NAME;
  }

  toPayload(): Record<string, unknown> {
    return {
      ...super.toPayload(),
      instanceId: this.instanceId,
      definitionId: this.definitionId,
      reason: this.reason,
    };
  }
}
