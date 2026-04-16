/**
 * Marketing Connections CRUD API.
 *
 * GET  /api/marketing/connections  — List all connections for the current user
 * DELETE /api/marketing/connections — Revoke a specific connection (by id in body)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isDemoRequest } from '@/lib/demoMode';
import { prisma } from '@/lib/prisma';
import type { MarketingConnectionDTO } from '@/types/marketing';

// ── Demo data ───────────────────────────────────────────────────────────────

const DEMO_CONNECTIONS: MarketingConnectionDTO[] = [
  {
    id: 'demo-conn-meta',
    platform: 'META',
    adAccountId: '123456789',
    adAccountName: 'Suple Demo — Meta',
    status: 'ACTIVE',
    tokenExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    scopes: 'ads_management,ads_read',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-conn-google',
    platform: 'GOOGLE_ADS',
    adAccountId: '987-654-3210',
    adAccountName: 'Suple Demo — Google Ads',
    status: 'ACTIVE',
    tokenExpiresAt: new Date(Date.now() + 45 * 86400000).toISOString(),
    scopes: 'adwords',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-conn-tiktok',
    platform: 'TIKTOK',
    adAccountId: null,
    adAccountName: null,
    status: 'EXPIRED',
    tokenExpiresAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    scopes: 'advertiser_management',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

// ── GET — List connections ──────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (isDemoRequest(request)) {
    return NextResponse.json({ connections: DEMO_CONNECTIONS });
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: token.email },
    });

    if (!user) {
      return NextResponse.json({ connections: [] });
    }

    const connections = await prisma.marketingConnection.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        platform: true,
        adAccountId: true,
        adAccountName: true,
        status: true,
        tokenExpiresAt: true,
        scopes: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // SQLite + better-sqlite3 adapter returns dates as ISO strings, not Date
    // objects. Wrap with `new Date()` so serialisation is safe either way.
    const toISO = (v: unknown): string => {
      if (v instanceof Date) return v.toISOString();
      if (typeof v === 'string') return new Date(v).toISOString();
      return new Date().toISOString();
    };

    // Filter out REVOKED connections so the UI only shows relevant ones,
    // and deduplicate by platform (keep the most recent ACTIVE one).
    const seen = new Set<string>();
    const unique = connections.filter((c: { platform: string; status: string }) => {
      if (c.status === 'REVOKED') return false;
      const key = c.platform;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const dto: MarketingConnectionDTO[] = unique.map((c: {
      id: string;
      platform: string;
      adAccountId: string | null;
      adAccountName: string | null;
      status: string;
      tokenExpiresAt: Date | string | null;
      scopes: string | null;
      createdAt: Date | string;
      updatedAt: Date | string;
    }) => ({
      id: c.id,
      platform: c.platform as MarketingConnectionDTO['platform'],
      adAccountId: c.adAccountId,
      adAccountName: c.adAccountName,
      status: c.status as MarketingConnectionDTO['status'],
      tokenExpiresAt: c.tokenExpiresAt ? toISO(c.tokenExpiresAt) : null,
      scopes: c.scopes,
      createdAt: toISO(c.createdAt),
      updatedAt: toISO(c.updatedAt),
    }));

    return NextResponse.json({ connections: dto });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[marketing/connections] GET error:', message, error);
    return NextResponse.json(
      { error: 'Failed to fetch connections', detail: message },
      { status: 500 },
    );
  }
}

// ── DELETE — Revoke a connection ────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  if (isDemoRequest(request)) {
    return NextResponse.json({ success: true });
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const connectionId = body.connectionId as string;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'connectionId is required' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: token.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify the connection belongs to this user
    const connection = await prisma.marketingConnection.findFirst({
      where: { id: connectionId, userId: user.id },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 },
      );
    }

    // Soft-revoke: mark as REVOKED instead of deleting
    await prisma.marketingConnection.update({
      where: { id: connectionId },
      data: { status: 'REVOKED' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to revoke connection', detail: message },
      { status: 500 },
    );
  }
}
