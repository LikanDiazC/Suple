import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isDemoRequest } from '@/lib/demoMode';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { getMarketingService } from '@/application/services/marketing';

const MOCK_DATA = {
  campaigns: 2,
  spend: 890000,
  impressions: 124000,
  clicks: 4200,
  conversions: 68,
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
          where: { userId: user.id, platform: 'TIKTOK', status: 'ACTIVE' },
        });
        if (conn) {
          const accessToken = decrypt(conn.encryptedAccessToken);
          const service = getMarketingService('TIKTOK');
          const advertiserId = conn.adAccountId ?? '';
          try {
            const campaigns = await service.getCampaigns(accessToken, advertiserId);
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
            console.warn(`[TikTok] DB token failed: ${err instanceof Error ? err.message : 'Unknown'}`);
          }
        }
      }
    }

    // ── 2) Fallback: env-var tokens ──────────────────────────────────────
    const token = process.env.TIKTOK_ACCESS_TOKEN;
    const advertiserId = process.env.TIKTOK_ADVERTISER_ID;

    if (token) {
      const url = new URL('https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/');
      url.searchParams.set('advertiser_id', advertiserId ?? '');
      url.searchParams.set('report_type', 'BASIC');
      url.searchParams.set('data_level', 'AUCTION_CAMPAIGN');
      url.searchParams.set('dimensions', JSON.stringify(['campaign_id']));
      url.searchParams.set('metrics', JSON.stringify(['spend', 'impressions', 'clicks', 'conversion']));

      const now = new Date();
      url.searchParams.set('start_date', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
      url.searchParams.set('end_date', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);

      const res = await fetch(url.toString(), { cache: 'no-store', headers: { 'Access-Token': token } });
      if (!res.ok) {
        const errorBody = await res.text();
        return NextResponse.json({ error: 'TikTok API failed', detail: errorBody }, { status: res.status, headers: { 'Cache-Control': 'no-store' } });
      }

      const json = await res.json();
      const rows = json.data?.list ?? [];
      let totalImpressions = 0, totalClicks = 0, totalSpend = 0, totalConversions = 0;
      for (const row of rows) {
        const m = row.metrics ?? {};
        totalImpressions += parseInt(m.impressions ?? '0', 10);
        totalClicks += parseInt(m.clicks ?? '0', 10);
        totalSpend += Math.round(parseFloat(m.spend ?? '0'));
        totalConversions += parseInt(m.conversion ?? '0', 10);
      }

      return NextResponse.json(
        { campaigns: rows.length, spend: totalSpend, impressions: totalImpressions, clicks: totalClicks, conversions: totalConversions, mock: false },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json(MOCK_DATA, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', detail: message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
