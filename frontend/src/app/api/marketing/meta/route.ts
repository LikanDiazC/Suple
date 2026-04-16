import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isDemoRequest } from '@/lib/demoMode';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { getMarketingService } from '@/application/services/marketing';

const MOCK_DATA = {
  campaigns: 3,
  spend: 5137000,
  impressions: 412000,
  clicks: 8920,
  conversions: 126,
  mock: true,
};

export async function GET(request: NextRequest) {
  if (isDemoRequest(request)) return NextResponse.json(MOCK_DATA);

  try {
    // ── 1) DB-stored connection (OAuth multi-tenant) ─────────────────────
    const session = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (session?.email) {
      const user = await prisma.user.findUnique({ where: { email: session.email } });
      if (user) {
        const conn = await prisma.marketingConnection.findFirst({
          where: { userId: user.id, platform: 'META', status: 'ACTIVE' },
        });
        if (conn) {
          const accessToken = decrypt(conn.encryptedAccessToken);
          const service = getMarketingService('META');
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
            console.warn(`[Meta] DB token failed: ${err instanceof Error ? err.message : 'Unknown'}`);
          }
        }
      }
    }

    // ── 2) Fallback: env-var tokens ──────────────────────────────────────
    const token = process.env.META_ACCESS_TOKEN;
    const adAccountId = process.env.META_AD_ACCOUNT_ID;

    if (token && adAccountId) {
      const url = new URL(`https://graph.facebook.com/v19.0/act_${adAccountId}/insights`);
      url.searchParams.set('access_token', token);
      url.searchParams.set('fields', 'impressions,clicks,spend,actions,date_start,date_stop');
      url.searchParams.set('date_preset', 'this_month');

      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (!res.ok) {
        const errorBody = await res.text();
        return NextResponse.json(
          { error: 'Meta API request failed', detail: errorBody },
          { status: res.status, headers: { 'Cache-Control': 'no-store' } },
        );
      }

      const json = await res.json();
      const insights = json.data ?? [];
      let totalImpressions = 0, totalClicks = 0, totalSpend = 0, totalConversions = 0;

      for (const row of insights) {
        totalImpressions += parseInt(row.impressions ?? '0', 10);
        totalClicks += parseInt(row.clicks ?? '0', 10);
        totalSpend += Math.round(parseFloat(row.spend ?? '0'));
        const conv = (row.actions ?? []).find(
          (a: { action_type: string }) => a.action_type === 'offsite_conversion' || a.action_type === 'lead',
        );
        if (conv) totalConversions += parseInt(conv.value ?? '0', 10);
      }

      return NextResponse.json(
        { campaigns: insights.length, spend: totalSpend, impressions: totalImpressions, clicks: totalClicks, conversions: totalConversions, mock: false },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // ── 3) No credentials → mock ────────────────────────────────────────
    return NextResponse.json(MOCK_DATA, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', detail: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
