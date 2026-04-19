import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TenantMiddleware } from './modules/iam/infrastructure/middleware/TenantMiddleware';
import { InfrastructureModule } from './infrastructure/InfrastructureModule';
import { IamModule } from './modules/iam/iam.module';
import { CrmModule } from './modules/crm/crm.module';
import { SiiModule } from './modules/sii/sii.module';
import { ScmModule } from './modules/scm/scm.module';
import { BpmsModule } from './modules/bpms/bpms.module';
import { ErpModule } from './modules/erp/erp.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { GmailModule } from './modules/gmail/gmail.module';
import { IpThrottlerGuard } from './infrastructure/guards/IpThrottlerGuard';

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

    // -----------------------------------------------------------------------
    // Shared infrastructure (EventBus + KafkaEventProducer) — @Global()
    // -----------------------------------------------------------------------
    InfrastructureModule,

    // Bounded context modules (DDD) — re-enabled per phase
    IamModule,
    CrmModule,
    ScmModule,
    BpmsModule,
    ErpModule,
    SiiModule,
    MarketingModule,
    AnalyticsModule,
    GmailModule,
  ],
  providers: [
    // AUDIT FIX #2: Register IpThrottlerGuard globally via DI.
    // Uses X-Forwarded-For from the Next.js proxy so each end-user
    // gets their own independent rate-limit bucket (not shared by
    // the proxy's IP 127.0.0.1).
    {
      provide: APP_GUARD,
      useClass: IpThrottlerGuard,
    },
  ],
  // EventBus is exported by InfrastructureModule (@Global) — no re-export needed here.
  exports: [],
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
        'api/gmail/tracking/(.*)',
        'api/gmail/oauth/callback',
      )
      .forRoutes('*');
  }
}
