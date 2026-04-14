import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer, Partitioners } from 'kafkajs';
import { DomainEvent } from '../../../shared/kernel';
import { EventBus } from '../events/EventBus';

/**
 * ==========================================================================
 * Kafka Producer Adapter
 * ==========================================================================
 *
 * Infrastructure adapter that bridges the domain EventBus with Apache Kafka.
 *
 * Topic naming convention: {bounded-context}.{aggregate}.{event-type}
 *   Example: "crm.contact.duplicate_detected"
 *
 * Each message includes:
 *   - Key: tenantId (ensures ordering per tenant within a partition).
 *   - Value: JSON-serialized event payload.
 *   - Headers: eventId, eventName, timestamp for observability.
 *
 * Delivery guarantee: At-least-once via Kafka acks=all + idempotent producer.
 * Consumers must be idempotent (deduplicate by eventId).
 * ==========================================================================
 */
@Injectable()
export class KafkaEventProducer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaEventProducer.name);
  private producer: Producer;
  private kafka: Kafka;

  constructor(private readonly eventBus: EventBus) {
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID ?? 'enterprise-saas',
      brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
      ssl: process.env.KAFKA_SSL === 'true',
      retry: {
        initialRetryTime: 300,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.DefaultPartitioner,
      idempotent: true,
      maxInFlightRequests: 5,
      transactionalId: process.env.KAFKA_TX_ID,
    });
  }

  async onModuleInit(): Promise<void> {
    if (process.env.KAFKA_ENABLED !== 'true') {
      this.logger.warn('Kafka disabled (set KAFKA_ENABLED=true to connect)');
      return;
    }

    try {
      await this.producer.connect();
      this.logger.log('Kafka producer connected');

      this.eventBus.setExternalPublisher(async (event) => {
        await this.publishDomainEvent(event);
      });
    } catch (err) {
      this.logger.error('Kafka connection failed -- events will only dispatch locally', err);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (process.env.KAFKA_ENABLED !== 'true') return;

    try {
      await this.producer.disconnect();
      this.logger.log('Kafka producer disconnected');
    } catch {
      // Silently ignore disconnect errors on shutdown.
    }
  }

  private async publishDomainEvent(event: DomainEvent): Promise<void> {
    const topic = event.eventName; // e.g., "crm.contact.duplicate_detected"
    const payload = event.toPayload();

    await this.producer.send({
      topic,
      messages: [
        {
          key: event.tenantId,
          value: JSON.stringify(payload),
          headers: {
            eventId: event.eventId,
            eventName: event.eventName,
            tenantId: event.tenantId,
            timestamp: event.occurredOn.toISOString(),
          },
        },
      ],
    });

    this.logger.debug(
      `Published event ${event.eventName} [${event.eventId}] to Kafka topic: ${topic}`,
    );
  }
}
