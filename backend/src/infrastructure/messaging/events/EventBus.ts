import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { DomainEvent } from '../../../shared/kernel';

/**
 * ==========================================================================
 * Domain Event Bus
 * ==========================================================================
 *
 * In-process event dispatcher that bridges the domain layer with
 * the messaging infrastructure (Kafka/RabbitMQ).
 *
 * Flow:
 *   1. AggregateRoot accumulates domain events during a transaction.
 *   2. After repository.save() commits, the UoW calls eventBus.publishAll().
 *   3. EventBus dispatches to local handlers (same process) AND
 *      forwards to Kafka for cross-service consumption.
 *
 * This two-phase approach ensures:
 *   - Local handlers (same bounded context) execute synchronously.
 *   - Remote handlers (other microservices) receive events via Kafka
 *     with at-least-once delivery guarantees.
 * ==========================================================================
 */

type EventHandler = (event: DomainEvent) => Promise<void>;

@Injectable()
export class EventBus implements OnModuleDestroy {
  private handlers = new Map<string, EventHandler[]>();
  private externalPublisher?: (event: DomainEvent) => Promise<void>;

  registerHandler(eventName: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler);
    this.handlers.set(eventName, existing);
  }

  setExternalPublisher(publisher: (event: DomainEvent) => Promise<void>): void {
    this.externalPublisher = publisher;
  }

  async publish(event: DomainEvent): Promise<void> {
    // Local handlers (synchronous within the bounded context).
    const localHandlers = this.handlers.get(event.eventName) ?? [];
    await Promise.all(localHandlers.map((handler) => handler(event)));

    // External publisher (Kafka/RabbitMQ for cross-service events).
    if (this.externalPublisher) {
      await this.externalPublisher(event);
    }
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  onModuleDestroy(): void {
    this.handlers.clear();
  }
}
