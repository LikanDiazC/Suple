/**
 * POST /api/marketing/track
 *
 * Server-side event tracking endpoint.
 * Receives a conversion event and fans it out to all connected platforms
 * with automatic deduplication.
 *
 * Body:
 * {
 *   eventId: string,      // Client-generated UUID
 *   eventName: string,     // "Purchase", "Lead", "AddToCart", etc.
 *   eventTime?: number,    // Unix timestamp (defaults to now)
 *   userData: { email?, phone?, ip?, userAgent?, fbc?, fbp?, ttclid? },
 *   customData?: { currency?, value?, contentIds?, contentType? },
 *   sourceUrl?: string,
 *   platforms?: string[],  // Optional: only send to these platforms
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isDemoRequest } from '@/lib/demoMode';
import { prisma } from '@/lib/prisma';
import { sendTrackingEvent } from '@/application/services/marketing/tracking';
import type { MarketingPlatform, TrackingEvent } from '@/types/marketing';

// ── Demo response ───────────────────────────────────────────────────────────

const DEMO_RESPONSE = {
  results: [
    { platform: 'META', success: true, eventId: 'demo-event-1' },
    { platform: 'TIKTOK', success: true, eventId: 'demo-event-1' },
  ],
  message: 'Demo mode — events not actually sent',
};

// ── POST handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (isDemoRequest(request)) {
    return NextResponse.json(DEMO_RESPONSE);
  }

  // Auth
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.eventId || !body.eventName) {
      return NextResponse.json(
        { error: 'eventId and eventName are required' },
        { status: 400 },
      );
    }

    // Look up user
    const user = await prisma.user.findUnique({
      where: { email: token.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found — connect a marketing platform first' },
        { status: 404 },
      );
    }

    const event: TrackingEvent = {
      eventId: body.eventId,
      eventName: body.eventName,
      eventTime: body.eventTime,
      userData: body.userData ?? {},
      customData: body.customData,
      sourceUrl: body.sourceUrl,
    };

    const platforms = body.platforms as MarketingPlatform[] | undefined;

    const results = await sendTrackingEvent({
      tenantId: user.tenantId,
      userId: user.id,
      event,
      platforms,
    });

    return NextResponse.json(
      { results },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Tracking failed', detail: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
