import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
 * AUDIT FIX #2: ThrottlerModule configured globally.
 *
 * Default limits (applied to ALL endpoints unless overridden):
 *   - 60 requests per 60 seconds per IP
 *
 * Sensitive endpoints (SII auth) override with stricter limits
 * via @Throttle() decorator at the controller/handler level.
 *
 * ThrottlerGuard is registered as a global APP_GUARD so no endpoint
 * can bypass rate limiting accidentally (defense in depth).
 * ==========================================================================
 */
@Module({
  imports: [
    // -----------------------------------------------------------------------
    // AUDIT FIX #2: Global rate limiting — mitigates brute-force & DDoS
    // -----------------------------------------------------------------------
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,   // 60 seconds window
        limit: 60,     // max 60 requests per window per IP
      },
    ]),

    // Bounded context modules (DDD)
    CrmModule,
    SiiModule,
    // ERPModule,
    // SCMModule,
    // BPMSModule,
  ],
  providers: [
    EventBus,
    KafkaEventProducer,

    // AUDIT FIX #2: Register ThrottlerGuard globally via DI
    // This ensures ALL routes are rate-limited by default.
    // Individual controllers/handlers can override with @Throttle()
    // or skip with @SkipThrottle().
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
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
