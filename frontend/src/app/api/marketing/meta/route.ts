import { NextRequest, NextResponse } from 'next/server';

const MOCK_DATA = {
  campaigns: 3,
  spend: 5137000,
  impressions: 412000,
  clicks: 8920,
  conversions: 126,
  mock: true,
};

export async function GET(_request: NextRequest) {
  try {
    const token = process.env.META_ACCESS_TOKEN;
    const adAccountId = process.env.META_AD_ACCOUNT_ID;

    if (token && adAccountId) {
      const url = new URL(
        `https://graph.facebook.com/v19.0/act_${adAccountId}/insights`,
      );
      url.searchParams.set('access_token', token);
      url.searchParams.set(
        'fields',
        'impressions,clicks,spend,actions,date_start,date_stop',
      );
      url.searchParams.set('date_preset', 'this_month');

      const res = await fetch(url.toString(), { cache: 'no-store' });

      if (!res.ok) {
        const errorBody = await res.text();
        return NextResponse.json(
          { error: 'Meta API request failed', detail: errorBody },
          {
            status: res.status,
            headers: { 'Cache-Control': 'no-store' },
          },
        );
      }

      const json = await res.json();

      // Aggregate from the insights response
      const insights = json.data ?? [];
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalSpend = 0;
      let totalConversions = 0;

      for (const row of insights) {
        totalImpressions += parseInt(row.impressions ?? '0', 10);
        totalClicks += parseInt(row.clicks ?? '0', 10);
        totalSpend += Math.round(parseFloat(row.spend ?? '0') * 1);
        const conversionsAction = (row.actions ?? []).find(
          (a: { action_type: string }) =>
            a.action_type === 'offsite_conversion' ||
            a.action_type === 'lead',
        );
        if (conversionsAction) {
          totalConversions += parseInt(conversionsAction.value ?? '0', 10);
        }
      }

      return NextResponse.json(
        {
          campaigns: insights.length,
          spend: totalSpend,
          impressions: totalImpressions,
          clicks: totalClicks,
          conversions: totalConversions,
          mock: false,
          raw: json,
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
