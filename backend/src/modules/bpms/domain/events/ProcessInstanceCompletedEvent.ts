import { DomainEvent } from '../../../../shared/kernel/DomainEvent';

export class ProcessInstanceCompletedEvent extends DomainEvent {
  static readonly EVENT_NAME = 'bpms.instance.completed';

  constructor(
    tenantId: string,
    public readonly instanceId: string,
    public readonly definitionId: string,
    public readonly title: string,
    public readonly completedAt: Date,
  ) {
    super(tenantId);
  }

  get eventName(): string {
    return ProcessInstanceCompletedEvent.EVENT_NAME;
  }

  toPayload(): Record<string, unknown> {
    return {
      ...super.toPayload(),
      instanceId: this.instanceId,
      definitionId: this.definitionId,
      title: this.title,
      completedAt: this.completedAt.toISOString(),
    };
  }
}
