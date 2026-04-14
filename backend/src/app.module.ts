import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TenantMiddleware } from './modules/iam/infrastructure/middleware/TenantMiddleware';
import { EventBus } from './infrastructure/messaging/events/EventBus';
import { KafkaEventProducer } from './infrastructure/messaging/kafka/KafkaProducer';
import { CrmModule } from './modules/crm/crm.module';
import { SiiModule } from './modules/sii/sii.module';

/**
 * ==========================================================================
 * Application Root Module
 * ==========================================================================
 *
 * Composes all bounded context modules and cross-cutting infrastructure.
 *
 * Module Organization (DDD Bounded Contexts):
 *   - IAMModule:   Identity, Authentication, Authorization (RBAC/ABAC)
 *   - CRMModule:   Contacts, Leads, Opportunities, Entity Resolution
 *   - ERPModule:   Universal Journal, Financial Reporting
 *   - SCMModule:   Inventory, Forecasting, Purchase Orders
 *   - BPMSModule:  Process Definitions, DAG Execution, Business Rules
 *
 * Cross-Cutting Infrastructure:
 *   - TenantMiddleware: Applied globally to enforce multi-tenant isolation.
 *   - EventBus + Kafka: Event-driven communication between modules.
 *   - Observability:    Structured logging, distributed tracing.
 * ==========================================================================
 */
@Module({
  imports: [
    // Each module self-registers its domain services, repositories,
    // use cases, and controllers following the DDD module pattern.
    // IAMModule,
    CrmModule,
    SiiModule,
    // ERPModule,
    // SCMModule,
    // BPMSModule,
  ],
  providers: [
    EventBus,
    KafkaEventProducer,
  ],
  exports: [EventBus],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        '/health',
        '/metrics',
        '/auth/login',
        '/auth/sso/callback',
        '/auth/sso/metadata',
        // Dev-mode: CRM API accessible without JWT (hardcoded tenant)
        'api/crm/(.*)',
        // SII auth is its own authentication domain (SII credentials, not app JWT)
        'api/sii/(.*)',
      )
      .forRoutes('*');
  }
}
