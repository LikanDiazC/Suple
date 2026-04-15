import { DomainEvent } from '../../../../shared/kernel/DomainEvent';

export class TaskCreatedEvent extends DomainEvent {
  static readonly EVENT_NAME = 'bpms.task.created';

  constructor(
    tenantId: string,
    public readonly taskId: string,
    public readonly instanceId: string,
    public readonly nodeId: string,
    public readonly assigneeUserId: string | null,
    public readonly assigneeRole: string | null,
    public readonly dueDate: Date | null,
  ) {
    super(tenantId);
  }

  get eventName(): string {
    return TaskCreatedEvent.EVENT_NAME;
  }

  toPayload(): Record<string, unknown> {
    return {
      ...super.toPayload(),
      taskId: this.taskId,
      instanceId: this.instanceId,
      nodeId: this.nodeId,
      assigneeUserId: this.assigneeUserId,
      assigneeRole: this.assigneeRole,
      dueDate: this.dueDate?.toISOString() ?? null,
    };
  }
}
