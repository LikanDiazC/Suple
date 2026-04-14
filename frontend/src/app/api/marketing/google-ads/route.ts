import { NextRequest, NextResponse } from 'next/server';

const MOCK_DATA = {
  campaigns: 2,
  spend: 2100000,
  impressions: 198000,
  clicks: 6420,
  conversions: 144,
  mock: true,
};

export async function GET(_request: NextRequest) {
  try {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

    if (developerToken && customerId) {
      // Google Ads API v16 — Campaign performance query
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
          {
            status: res.status,
            headers: { 'Cache-Control': 'no-store' },
          },
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

    // No credentials configured — return mock data
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
