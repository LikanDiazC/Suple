import { NextRequest, NextResponse } from 'next/server';

const MOCK_DATA = {
  campaigns: 1,
  spend: 1650000,
  impressions: 40100,
  clicks: 1506,
  conversions: 14,
  mock: true,
};

export async function GET(_request: NextRequest) {
  try {
    const token = process.env.LINKEDIN_ACCESS_TOKEN;
    const adAccountId = process.env.LINKEDIN_AD_ACCOUNT_ID;

    if (token) {
      // LinkedIn Marketing API v2 — Ad Analytics
      const now = new Date();
      const startMonth = now.getMonth() + 1;
      const startYear = now.getFullYear();

      const url = new URL(
        'https://api.linkedin.com/v2/adAnalyticsV2',
      );
      url.searchParams.set('q', 'analytics');
      url.searchParams.set('pivot', 'CAMPAIGN');
      url.searchParams.set(
        'dateRange.start.month',
        String(startMonth),
      );
      url.searchParams.set(
        'dateRange.start.year',
        String(startYear),
      );
      url.searchParams.set('dateRange.start.day', '1');
      url.searchParams.set('dateRange.end.month', String(startMonth));
      url.searchParams.set('dateRange.end.year', String(startYear));
      url.searchParams.set(
        'dateRange.end.day',
        String(now.getDate()),
      );
      url.searchParams.set('timeGranularity', 'MONTHLY');
      if (adAccountId) {
        url.searchParams.set(
          'accounts',
          `urn:li:sponsoredAccount:${adAccountId}`,
        );
      }

      const res = await fetch(url.toString(), {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });

      if (!res.ok) {
        const errorBody = await res.text();
        return NextResponse.json(
          { error: 'LinkedIn API request failed', detail: errorBody },
          {
            status: res.status,
            headers: { 'Cache-Control': 'no-store' },
          },
        );
      }

      const json = await res.json();
      const elements = json.elements ?? [];

      let totalImpressions = 0;
      let totalClicks = 0;
      let totalSpend = 0;
      let totalConversions = 0;
      const campaignUrns = new Set<string>();

      for (const el of elements) {
        if (el.pivotValue) campaignUrns.add(el.pivotValue);
        totalImpressions += el.impressions ?? 0;
        totalClicks += el.clicks ?? 0;
        totalSpend += Math.round(
          parseFloat(el.costInLocalCurrency ?? '0'),
        );
        totalConversions +=
          el.externalWebsiteConversions ?? el.oneClickLeads ?? 0;
      }

      return NextResponse.json(
        {
          campaigns: campaignUrns.size,
          spend: totalSpend,
          impressions: totalImpressions,
          clicks: totalClicks,
          conversions: totalConversions,
          mock: false,
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // No token configured — return mock data
    return NextResponse.json(MOCK_DATA, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', detail: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
