import { DomainEvent } from '../../../../shared/kernel/DomainEvent';

export class TaskCompletedEvent extends DomainEvent {
  static readonly EVENT_NAME = 'bpms.task.completed';

  constructor(
    tenantId: string,
    public readonly taskId: string,
    public readonly instanceId: string,
    public readonly nodeId: string,
    public readonly outcome: string,
    public readonly completedBy: string,
  ) {
    super(tenantId);
  }

  get eventName(): string {
    return TaskCompletedEvent.EVENT_NAME;
  }

  toPayload(): Record<string, unknown> {
    return {
      ...super.toPayload(),
      taskId: this.taskId,
      instanceId: this.instanceId,
      nodeId: this.nodeId,
      outcome: this.outcome,
      completedBy: this.completedBy,
    };
  }
}
