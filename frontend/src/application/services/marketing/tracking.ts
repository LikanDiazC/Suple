/**
 * Server-Side Tracking with Event Deduplication.
 *
 * Sends conversion events to multiple platforms simultaneously (Meta CAPI,
 * TikTok Events API, LinkedIn Conversions API) while ensuring each
 * (eventId, platform) pair is only sent once.
 *
 * Deduplication uses the `TrackingEvent` table in the DB. If a duplicate
 * is detected, it skips the API call and returns `deduplicated: true`.
 *
 * Usage:
 *   const results = await sendTrackingEvent({
 *     tenantId: 'tenant_123',
 *     userId: 'user_456',
 *     event: { eventId: 'uuid-v4', eventName: 'Purchase', ... },
 *     platforms: ['META', 'TIKTOK'],
 *   });
 */

import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { getMarketingService } from './index';
import type { MarketingPlatform, TrackingEvent, TrackingResult } from './types';
import type { MarketingPlatform as PrismaMarketingPlatform } from '@/generated/prisma/enums';

interface SendTrackingInput {
  tenantId: string;
  userId: string;
  event: TrackingEvent;
  /** Which platforms to send to. If omitted, sends to all connected platforms. */
  platforms?: MarketingPlatform[];
}

/**
 * Send a conversion event to one or more platforms with deduplication.
 *
 * Steps:
 * 1. Look up which platforms the user has connected (with ACTIVE tokens).
 * 2. For each target platform, check the DB for a prior send with the same eventId.
 * 3. If not yet sent, fire the API call and record the result.
 * 4. Return an array of results per platform.
 */
export async function sendTrackingEvent(input: SendTrackingInput): Promise<TrackingResult[]> {
  const { tenantId, userId, event, platforms } = input;

  // 1) Find active connections for this user
  const connections = await prisma.marketingConnection.findMany({
    where: {
      userId,
      tenantId,
      status: 'ACTIVE',
      ...(platforms ? { platform: { in: platforms } } : {}),
    },
  });

  if (connections.length === 0) {
    return [];
  }

  // 2) Run all platform sends in parallel
  const results = await Promise.allSettled(
    connections.map(async (conn: {
      id: string;
      platform: string;
      encryptedAccessToken: string;
      encryptedRefreshToken: string | null;
      tokenExpiresAt: Date | null;
      adAccountId: string | null;
    }): Promise<TrackingResult> => {
      // ── Deduplication check ──────────────────────────────────────────
      const existing = await prisma.trackingEvent.findUnique({
        where: {
          eventId_platform: {
            eventId: event.eventId,
            platform: conn.platform as PrismaMarketingPlatform,
          },
        },
      });

      if (existing) {
        return {
          platform: conn.platform as MarketingPlatform,
          success: true,
          eventId: event.eventId,
          deduplicated: true,
        };
      }

      // ── Token refresh if expired ─────────────────────────────────────
      let accessToken = decrypt(conn.encryptedAccessToken);
      const now = new Date();

      if (conn.tokenExpiresAt && conn.tokenExpiresAt < now && conn.encryptedRefreshToken) {
        try {
          const svc = getMarketingService(conn.platform as MarketingPlatform);
          const refreshed = await svc.refreshToken(decrypt(conn.encryptedRefreshToken));

          const { encrypt } = await import('@/lib/encryption');
          await prisma.marketingConnection.update({
            where: { id: conn.id },
            data: {
              encryptedAccessToken: encrypt(refreshed.accessToken),
              encryptedRefreshToken: refreshed.refreshToken
                ? encrypt(refreshed.refreshToken)
                : conn.encryptedRefreshToken,
              tokenExpiresAt: refreshed.expiresIn
                ? new Date(Date.now() + refreshed.expiresIn * 1000)
                : null,
              status: 'ACTIVE',
            },
          });

          accessToken = refreshed.accessToken;
        } catch {
          // Mark connection as expired if refresh fails
          await prisma.marketingConnection.update({
            where: { id: conn.id },
            data: { status: 'EXPIRED' },
          });

          return {
            platform: conn.platform as MarketingPlatform,
            success: false,
            eventId: event.eventId,
            error: 'Token refresh failed — connection marked as EXPIRED',
          };
        }
      }

      // ── Send the event ───────────────────────────────────────────────
      const svc = getMarketingService(conn.platform as MarketingPlatform);
      const pixelOrConversionId = conn.adAccountId ?? '';

      const result = await svc.sendServerEvent(accessToken, pixelOrConversionId, event);

      // ── Record in dedup table ────────────────────────────────────────
      await prisma.trackingEvent.create({
        data: {
          tenantId,
          userId,
          eventId: event.eventId,
          eventName: event.eventName,
          platform: conn.platform as PrismaMarketingPlatform,
          payload: JSON.stringify(event),
          status: result.success ? 'SENT' : 'FAILED',
          errorMsg: result.error,
        },
      });

      return result;
    }),
  );

  // 3) Unwrap settled promises
  return results.map((r: PromiseSettledResult<TrackingResult>) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      platform: 'META' as MarketingPlatform, // fallback — shouldn't happen
      success: false,
      eventId: event.eventId,
      error: r.reason instanceof Error ? r.reason.message : 'Unknown error',
    };
  });
}

/**
 * Get tracking event history for a tenant (admin dashboard).
 */
export async function getTrackingHistory(
  tenantId: string,
  options?: { limit?: number; eventName?: string },
) {
  return prisma.trackingEvent.findMany({
    where: {
      tenantId,
      ...(options?.eventName ? { eventName: options.eventName } : {}),
    },
    orderBy: { sentAt: 'desc' },
    take: options?.limit ?? 100,
  });
}
