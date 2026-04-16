/**
 * GET /api/marketing/connections/[id]/accounts
 *
 * Fetches available ad accounts for an existing marketing connection.
 * Used when the user needs to select or change which ad account to use.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isDemoRequest } from '@/lib/demoMode';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { getMarketingService } from '@/application/services/marketing';
import type { MarketingPlatform } from '@/types/marketing';

const DEMO_ACCOUNTS = [
  { id: '123456789', name: 'Demo Ad Account 1', currency: 'CLP', status: 'ACTIVE' },
  { id: '987654321', name: 'Demo Ad Account 2', currency: 'USD', status: 'ACTIVE' },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (isDemoRequest(request)) {
    return NextResponse.json({ accounts: DEMO_ACCOUNTS });
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({ where: { email: token.email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const connection = await prisma.marketingConnection.findFirst({
      where: { id, userId: user.id, status: 'ACTIVE' },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const accessToken = decrypt(connection.encryptedAccessToken);
    const service = getMarketingService(connection.platform as MarketingPlatform);
    const accounts = await service.getAdAccounts(accessToken);

    return NextResponse.json({ accounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch ad accounts', detail: message },
      { status: 500 },
    );
  }
}
