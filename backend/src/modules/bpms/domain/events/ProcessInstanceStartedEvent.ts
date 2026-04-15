import { DomainEvent } from '../../../../shared/kernel/DomainEvent';

export class ProcessInstanceStartedEvent extends DomainEvent {
  static readonly EVENT_NAME = 'bpms.instance.started';

  constructor(
    tenantId: string,
    public readonly instanceId: string,
    public readonly definitionId: string,
    public readonly title: string,
    public readonly startedBy: string,
  ) {
    super(tenantId);
  }

  get eventName(): string {
    return ProcessInstanceStartedEvent.EVENT_NAME;
  }

  toPayload(): Record<string, unknown> {
    return {
      ...super.toPayload(),
      instanceId: this.instanceId,
      definitionId: this.definitionId,
      title: this.title,
      startedBy: this.startedBy,
    };
  }
}
