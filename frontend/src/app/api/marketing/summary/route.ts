import { NextRequest, NextResponse } from 'next/server';

interface PlatformData {
  campaigns: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  mock: boolean;
}

const PLATFORMS = ['meta', 'google-ads', 'tiktok', 'linkedin'] as const;

async function fetchPlatform(
  baseUrl: string,
  platform: string,
): Promise<PlatformData> {
  try {
    const res = await fetch(`${baseUrl}/api/marketing/${platform}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`${platform} returned ${res.status}`);
    }
    return await res.json();
  } catch {
    // If an individual platform fails, return zeroed data flagged as error
    return {
      campaigns: 0,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      mock: true,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Derive the base URL from the incoming request so it works in any
    // environment (localhost, preview deploys, production).
    const { protocol, host } = request.nextUrl;
    const baseUrl = `${protocol}//${host}`;

    const results = await Promise.all(
      PLATFORMS.map(async (p) => ({
        platform: p,
        data: await fetchPlatform(baseUrl, p),
      })),
    );

    const platforms: Record<string, PlatformData> = {};
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;
    const realPlatforms: string[] = [];
    const mockPlatforms: string[] = [];

    for (const { platform, data } of results) {
      platforms[platform] = data;
      totalSpend += data.spend;
      totalImpressions += data.impressions;
      totalClicks += data.clicks;
      totalConversions += data.conversions;

      if (data.mock) {
        mockPlatforms.push(platform);
      } else {
        realPlatforms.push(platform);
      }
    }

    return NextResponse.json(
      {
        totals: {
          spend: totalSpend,
          impressions: totalImpressions,
          clicks: totalClicks,
          conversions: totalConversions,
        },
        platforms,
        realPlatforms,
        mockPlatforms,
        allMock: mockPlatforms.length === PLATFORMS.length,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', detail: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
