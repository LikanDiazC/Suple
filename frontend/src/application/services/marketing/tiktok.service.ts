/**
 * TikTok Marketing Service.
 *
 * - OAuth 2.0:   TikTok for Business OAuth
 * - Campaigns:   Marketing API v1.3
 * - Tracking:    Events API v2
 */

import { createHash } from 'crypto';
import type {
  IMarketingService,
  OAuthTokenSet,
  AdAccount,
  Campaign,
  TrackingEvent,
  TrackingResult,
} from './types';

const BUSINESS_API = 'https://business-api.tiktok.com/open_api';

export class TikTokService implements IMarketingService {
  readonly platform = 'TIKTOK' as const;

  private readonly appId: string;
  private readonly appSecret: string;

  constructor() {
    this.appId = process.env.TIKTOK_APP_ID ?? '';
    this.appSecret = process.env.TIKTOK_APP_SECRET ?? '';
  }

  // ── OAuth ───────────────────────────────────────────────────────────────

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      app_id: this.appId,
      redirect_uri: redirectUri,
      state,
      scope: 'advertiser_management,campaign_management,ad_management',
      response_type: 'code',
    });
    return `https://business-api.tiktok.com/portal/auth?${params}`;
  }

  async exchangeCode(code: string, _redirectUri: string): Promise<OAuthTokenSet> {
    const res = await fetch(`${BUSINESS_API}/v1.3/oauth2/access_token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: this.appId,
        secret: this.appSecret,
        auth_code: code,
      }),
    });

    if (!res.ok) throw new Error(`TikTok token exchange failed: ${res.status}`);

    const json = await res.json();
    const data = json.data ?? {};

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in ?? 86400,
      scope: Array.isArray(data.scope) ? data.scope.join(',') : String(data.scope ?? ''),
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokenSet> {
    const res = await fetch(`${BUSINESS_API}/v1.3/oauth2/refresh_token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: this.appId,
        secret: this.appSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) throw new Error(`TikTok token refresh failed: ${res.status}`);

    const json = await res.json();
    const data = json.data ?? {};

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in ?? 86400,
    };
  }

  // ── Ad Accounts ─────────────────────────────────────────────────────────

  async getAdAccounts(accessToken: string): Promise<AdAccount[]> {
    const url = new URL(`${BUSINESS_API}/v1.3/oauth2/advertiser/get/`);
    url.searchParams.set('app_id', this.appId);
    url.searchParams.set('secret', this.appSecret);

    const res = await fetch(url.toString(), {
      headers: { 'Access-Token': accessToken },
    });
    if (!res.ok) throw new Error(`TikTok getAdAccounts failed: ${res.status}`);

    const json = await res.json();
    const advertisers = json.data?.list ?? [];

    return advertisers.map(
      (adv: Record<string, unknown>) => ({
        id: String(adv.advertiser_id ?? ''),
        name: String(adv.advertiser_name ?? ''),
        currency: String(adv.currency ?? ''),
        timezone: String(adv.timezone ?? ''),
        status: 'ACTIVE',
      }),
    );
  }

  // ── Campaigns ───────────────────────────────────────────────────────────

  async getCampaigns(accessToken: string, advertiserId: string): Promise<Campaign[]> {
    // 1) List campaigns
    const listUrl = new URL(`${BUSINESS_API}/v1.3/campaign/get/`);
    listUrl.searchParams.set('advertiser_id', advertiserId);
    listUrl.searchParams.set('page_size', '100');

    const listRes = await fetch(listUrl.toString(), {
      headers: { 'Access-Token': accessToken },
    });
    if (!listRes.ok) throw new Error(`TikTok listCampaigns failed: ${listRes.status}`);
    const listJson = await listRes.json();
    const campaigns = listJson.data?.list ?? [];

    // 2) Get reporting data
    const now = new Date();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const reportUrl = new URL(`${BUSINESS_API}/v1.3/report/integrated/get/`);
    reportUrl.searchParams.set('advertiser_id', advertiserId);
    reportUrl.searchParams.set('report_type', 'BASIC');
    reportUrl.searchParams.set('data_level', 'AUCTION_CAMPAIGN');
    reportUrl.searchParams.set('dimensions', JSON.stringify(['campaign_id']));
    reportUrl.searchParams.set(
      'metrics',
      JSON.stringify(['spend', 'impressions', 'clicks', 'conversion']),
    );
    reportUrl.searchParams.set('start_date', startDate);
    reportUrl.searchParams.set('end_date', endDate);

    const reportRes = await fetch(reportUrl.toString(), {
      headers: { 'Access-Token': accessToken },
    });

    const metricsMap = new Map<string, Record<string, string>>();
    if (reportRes.ok) {
      const reportJson = await reportRes.json();
      for (const row of reportJson.data?.list ?? []) {
        metricsMap.set(String(row.dimensions?.campaign_id ?? ''), row.metrics ?? {});
      }
    }

    return campaigns.map((c: Record<string, unknown>) => {
      const cid = String(c.campaign_id ?? '');
      const m = metricsMap.get(cid) ?? {};
      return {
        id: cid,
        name: String(c.campaign_name ?? ''),
        status: String(c.operation_status ?? c.status ?? ''),
        objective: String(c.objective_type ?? ''),
        spend: Math.round(parseFloat(String(m.spend ?? '0'))),
        impressions: parseInt(String(m.impressions ?? '0'), 10),
        clicks: parseInt(String(m.clicks ?? '0'), 10),
        conversions: parseInt(String(m.conversion ?? '0'), 10),
      } satisfies Campaign;
    });
  }

  // ── Server-Side Tracking (Events API) ───────────────────────────────────

  async sendServerEvent(
    accessToken: string,
    pixelCode: string,
    event: TrackingEvent,
  ): Promise<TrackingResult> {
    const eventData: Record<string, unknown> = {
      event: event.eventName,
      event_id: event.eventId,
      timestamp: (event.eventTime ?? Math.floor(Date.now() / 1000)).toString(),
      context: {
        user_agent: event.userData.userAgent,
        ip: event.userData.ip,
        ad: {
          callback: event.userData.ttclid,
        },
        user: {
          email: event.userData.email ? sha256(event.userData.email.toLowerCase().trim()) : undefined,
          phone_number: event.userData.phone
            ? sha256(event.userData.phone.replace(/\D/g, ''))
            : undefined,
        },
        page: {
          url: event.sourceUrl,
        },
      },
      properties: event.customData
        ? {
            currency: event.customData.currency,
            value: event.customData.value,
            contents: event.customData.contentIds?.map((id) => ({
              content_id: id,
              content_type: event.customData?.contentType ?? 'product',
            })),
          }
        : undefined,
    };

    try {
      const res = await fetch(`${BUSINESS_API}/v1.3/pixel/track/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Token': accessToken,
        },
        body: JSON.stringify({
          pixel_code: pixelCode,
          event_data: [eventData],
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        return { platform: 'TIKTOK', success: false, eventId: event.eventId, error: body };
      }

      return { platform: 'TIKTOK', success: true, eventId: event.eventId };
    } catch (err) {
      return {
        platform: 'TIKTOK',
        success: false,
        eventId: event.eventId,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
