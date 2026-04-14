import { Entity } from './Entity';
import { DomainEvent } from './DomainEvent';
import { UniqueId } from './UniqueId';

/**
 * AggregateRoot extends Entity with domain event collection capabilities.
 * Aggregates are the transactional consistency boundaries in DDD.
 *
 * Events are accumulated during the aggregate's lifecycle and flushed
 * by the infrastructure layer (e.g., after a successful database commit)
 * to be dispatched to the event bus (Kafka/RabbitMQ).
 *
 * This pattern ensures:
 *   1. Events are only published after state is persisted (transactional outbox).
 *   2. The domain layer remains decoupled from messaging infrastructure.
 */
export abstract class AggregateRoot<TProps> extends Entity<TProps> {
  private _domainEvents: DomainEvent[] = [];

  protected constructor(id: UniqueId, tenantId: string, props: TProps) {
    super(id, tenantId, props);
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return [...this._domainEvents];
  }

  clearEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }
}
