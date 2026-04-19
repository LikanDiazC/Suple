import { Module, Global } from '@nestjs/common';
import { EventBus } from './messaging/events/EventBus';
import { KafkaEventProducer } from './messaging/kafka/KafkaProducer';
import { DatabaseModule } from './database/DatabaseModule';

/**
 * ==========================================================================
 * Infrastructure Module (Global)
 * ==========================================================================
 *
 * Provides and exports the cross-cutting infrastructure singletons that
 * every bounded-context module needs:
 *   - EventBus: in-process domain event dispatcher
 *   - KafkaEventProducer: bridges EventBus → Kafka external publisher
 *
 * @Global() ensures NestJS shares a single instance across the entire
 * application without each feature module needing to import this module
 * explicitly (though explicit imports are also acceptable for clarity).
 * ==========================================================================
 */
@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    EventBus,
    KafkaEventProducer,
  ],
  exports: [
    EventBus,
    KafkaEventProducer,
    DatabaseModule,
  ],
})
export class InfrastructureModule {}
