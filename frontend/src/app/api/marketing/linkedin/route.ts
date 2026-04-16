import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isDemoRequest } from '@/lib/demoMode';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { getMarketingService } from '@/application/services/marketing';

const MOCK_DATA = {
  campaigns: 1,
  spend: 1650000,
  impressions: 40100,
  clicks: 1506,
  conversions: 14,
  mock: true,
};

export async function GET(request: NextRequest) {
  if (isDemoRequest(request)) return NextResponse.json(MOCK_DATA);

  try {
    // ── 1) DB-stored connection ──────────────────────────────────────────
    const session = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (session?.email) {
      const user = await prisma.user.findUnique({ where: { email: session.email } });
      if (user) {
        const conn = await prisma.marketingConnection.findFirst({
          where: { userId: user.id, platform: 'LINKEDIN', status: 'ACTIVE' },
        });
        if (conn) {
          const accessToken = decrypt(conn.encryptedAccessToken);
          const service = getMarketingService('LINKEDIN');
          const adAccountId = conn.adAccountId ?? '';
          try {
            const campaigns = await service.getCampaigns(accessToken, adAccountId);
            return NextResponse.json(
              {
                campaigns: campaigns.length,
                spend: campaigns.reduce((s, c) => s + c.spend, 0),
                impressions: campaigns.reduce((s, c) => s + c.impressions, 0),
                clicks: campaigns.reduce((s, c) => s + c.clicks, 0),
                conversions: campaigns.reduce((s, c) => s + c.conversions, 0),
                mock: false,
                details: campaigns,
              },
              { headers: { 'Cache-Control': 'no-store' } },
            );
          } catch (err) {
            console.warn(`[LinkedIn] DB token failed: ${err instanceof Error ? err.message : 'Unknown'}`);
          }
        }
      }
    }

    // ── 2) Fallback: env-var tokens ──────────────────────────────────────
    const token = process.env.LINKEDIN_ACCESS_TOKEN;
    const adAccountId = process.env.LINKEDIN_AD_ACCOUNT_ID;

    if (token) {
      const now = new Date();
      const url = new URL('https://api.linkedin.com/v2/adAnalyticsV2');
      url.searchParams.set('q', 'analytics');
      url.searchParams.set('pivot', 'CAMPAIGN');
      url.searchParams.set('dateRange.start.month', String(now.getMonth() + 1));
      url.searchParams.set('dateRange.start.year', String(now.getFullYear()));
      url.searchParams.set('dateRange.start.day', '1');
      url.searchParams.set('dateRange.end.month', String(now.getMonth() + 1));
      url.searchParams.set('dateRange.end.year', String(now.getFullYear()));
      url.searchParams.set('dateRange.end.day', String(now.getDate()));
      url.searchParams.set('timeGranularity', 'MONTHLY');
      if (adAccountId) url.searchParams.set('accounts', `urn:li:sponsoredAccount:${adAccountId}`);

      const res = await fetch(url.toString(), {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0' },
      });

      if (!res.ok) {
        const errorBody = await res.text();
        return NextResponse.json({ error: 'LinkedIn API failed', detail: errorBody }, { status: res.status, headers: { 'Cache-Control': 'no-store' } });
      }

      const json = await res.json();
      const elements = json.elements ?? [];
      let totalImpressions = 0, totalClicks = 0, totalSpend = 0, totalConversions = 0;
      const campaignUrns = new Set<string>();

      for (const el of elements) {
        if (el.pivotValue) campaignUrns.add(el.pivotValue);
        totalImpressions += el.impressions ?? 0;
        totalClicks += el.clicks ?? 0;
        totalSpend += Math.round(parseFloat(el.costInLocalCurrency ?? '0'));
        totalConversions += el.externalWebsiteConversions ?? el.oneClickLeads ?? 0;
      }

      return NextResponse.json(
        { campaigns: campaignUrns.size, spend: totalSpend, impressions: totalImpressions, clicks: totalClicks, conversions: totalConversions, mock: false },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json(MOCK_DATA, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', detail: message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
