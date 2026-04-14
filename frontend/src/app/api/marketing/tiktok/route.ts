import { NextRequest, NextResponse } from 'next/server';

const MOCK_DATA = {
  campaigns: 2,
  spend: 890000,
  impressions: 124000,
  clicks: 4200,
  conversions: 68,
  mock: true,
};

export async function GET(_request: NextRequest) {
  try {
    const token = process.env.TIKTOK_ACCESS_TOKEN;
    const advertiserId = process.env.TIKTOK_ADVERTISER_ID;

    if (token) {
      // TikTok Marketing API v1.3 — Campaign reporting
      const url = new URL(
        'https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/',
      );
      url.searchParams.set('advertiser_id', advertiserId ?? '');
      url.searchParams.set('report_type', 'BASIC');
      url.searchParams.set('data_level', 'AUCTION_CAMPAIGN');
      url.searchParams.set(
        'dimensions',
        JSON.stringify(['campaign_id']),
      );
      url.searchParams.set(
        'metrics',
        JSON.stringify([
          'spend',
          'impressions',
          'clicks',
          'conversion',
        ]),
      );

      // Current month date range
      const now = new Date();
      const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      url.searchParams.set('start_date', startDate);
      url.searchParams.set('end_date', endDate);

      const res = await fetch(url.toString(), {
        cache: 'no-store',
        headers: {
          'Access-Token': token,
        },
      });

      if (!res.ok) {
        const errorBody = await res.text();
        return NextResponse.json(
          { error: 'TikTok API request failed', detail: errorBody },
          {
            status: res.status,
            headers: { 'Cache-Control': 'no-store' },
          },
        );
      }

      const json = await res.json();
      const rows = json.data?.list ?? [];

      let totalImpressions = 0;
      let totalClicks = 0;
      let totalSpend = 0;
      let totalConversions = 0;

      for (const row of rows) {
        const m = row.metrics ?? {};
        totalImpressions += parseInt(m.impressions ?? '0', 10);
        totalClicks += parseInt(m.clicks ?? '0', 10);
        totalSpend += Math.round(parseFloat(m.spend ?? '0'));
        totalConversions += parseInt(m.conversion ?? '0', 10);
      }

      return NextResponse.json(
        {
          campaigns: rows.length,
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
