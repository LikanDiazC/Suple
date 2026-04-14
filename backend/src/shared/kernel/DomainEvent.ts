import { UniqueId } from './UniqueId';

/**
 * Base class for all domain events in the system.
 * Domain events capture side-effect-free facts about state transitions
 * within a bounded context. They are the primary mechanism for
 * inter-module communication in an event-driven architecture.
 */
export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly tenantId: string;

  protected constructor(tenantId: string) {
    this.eventId = UniqueId.create().toString();
    this.occurredOn = new Date();
    this.tenantId = tenantId;
  }

  abstract get eventName(): string;

  toPayload(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventName: this.eventName,
      occurredOn: this.occurredOn.toISOString(),
      tenantId: this.tenantId,
    };
  }
}
