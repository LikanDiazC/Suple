import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isDemoRequest } from '@/lib/demoMode';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { getMarketingService } from '@/application/services/marketing';

const MOCK_DATA = {
  campaigns: 2,
  spend: 2100000,
  impressions: 198000,
  clicks: 6420,
  conversions: 144,
  mock: true,
};

export async function GET(request: NextRequest) {
  // Demo mode → return mock data immediately
  if (isDemoRequest(request)) {
    return NextResponse.json(MOCK_DATA);
  }

  try {
    // ── 1) Try DB-stored connection (OAuth multi-tenant) ─────────────────
    const session = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (session?.email) {
      const user = await prisma.user.findUnique({ where: { email: session.email } });
      if (user) {
        const conn = await prisma.marketingConnection.findFirst({
          where: { userId: user.id, platform: 'GOOGLE_ADS', status: 'ACTIVE' },
        });

        if (conn) {
          const accessToken = decrypt(conn.encryptedAccessToken);
          const service = getMarketingService('GOOGLE_ADS');
          const adAccountId = conn.adAccountId ?? '';

          try {
            const campaigns = await service.getCampaigns(accessToken, adAccountId);
            const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
            const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
            const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
            const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);

            return NextResponse.json(
              {
                campaigns: campaigns.length,
                spend: totalSpend,
                impressions: totalImpressions,
                clicks: totalClicks,
                conversions: totalConversions,
                mock: false,
                details: campaigns,
              },
              { headers: { 'Cache-Control': 'no-store' } },
            );
          } catch (err) {
            // Token might be expired — mark and fall through
            const msg = err instanceof Error ? err.message : 'Unknown';
            console.warn(`[Google Ads] DB token failed: ${msg}`);
          }
        }
      }
    }

    // ── 2) Fallback: env-var tokens (legacy single-tenant) ───────────────
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

    if (developerToken && customerId) {
      const query = `
        SELECT
          campaign.name,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions
        FROM campaign
        WHERE segments.date DURING THIS_MONTH
      `.trim();

      const res = await fetch(
        `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:searchStream`,
        {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.GOOGLE_ADS_ACCESS_TOKEN ?? ''}`,
            'developer-token': developerToken,
            ...(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
              ? { 'login-customer-id': process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID }
              : {}),
          },
          body: JSON.stringify({ query }),
        },
      );

      if (!res.ok) {
        const errorBody = await res.text();
        return NextResponse.json(
          { error: 'Google Ads API request failed', detail: errorBody },
          { status: res.status, headers: { 'Cache-Control': 'no-store' } },
        );
      }

      const json = await res.json();
      const rows = json[0]?.results ?? [];

      let totalImpressions = 0;
      let totalClicks = 0;
      let totalSpendMicros = 0;
      let totalConversions = 0;
      const campaignNames = new Set<string>();

      for (const row of rows) {
        campaignNames.add(row.campaign?.name ?? '');
        totalImpressions += parseInt(row.metrics?.impressions ?? '0', 10);
        totalClicks += parseInt(row.metrics?.clicks ?? '0', 10);
        totalSpendMicros += parseInt(row.metrics?.costMicros ?? '0', 10);
        totalConversions += parseFloat(row.metrics?.conversions ?? '0');
      }

      return NextResponse.json(
        {
          campaigns: campaignNames.size,
          spend: Math.round(totalSpendMicros / 1_000_000),
          impressions: totalImpressions,
          clicks: totalClicks,
          conversions: Math.round(totalConversions),
          mock: false,
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // ── 3) No credentials → mock data ────────────────────────────────────
    return NextResponse.json(MOCK_DATA, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', detail: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
