/**
 * LinkedIn Marketing Service.
 *
 * - OAuth 2.0:   LinkedIn OAuth 2.0 (3-legged)
 * - Campaigns:   Marketing API v2 (Ad Analytics)
 * - Tracking:    Conversions API
 */

import type {
  IMarketingService,
  OAuthTokenSet,
  AdAccount,
  Campaign,
  TrackingEvent,
  TrackingResult,
} from './types';

const LINKEDIN_API = 'https://api.linkedin.com/v2';
const REST_API = 'https://api.linkedin.com/rest';

export class LinkedInService implements IMarketingService {
  readonly platform = 'LINKEDIN' as const;

  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor() {
    this.clientId = process.env.LINKEDIN_CLIENT_ID ?? '';
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET ?? '';
  }

  // ── OAuth ───────────────────────────────────────────────────────────────

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state,
      scope: 'r_ads r_ads_reporting rw_ads w_member_social',
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenSet> {
    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!res.ok) throw new Error(`LinkedIn token exchange failed: ${res.status}`);

    const json = await res.json();
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in ?? 5184000, // 60 days
      scope: json.scope,
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokenSet> {
    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!res.ok) throw new Error(`LinkedIn token refresh failed: ${res.status}`);

    const json = await res.json();
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in ?? 5184000,
    };
  }

  // ── Ad Accounts ─────────────────────────────────────────────────────────

  async getAdAccounts(accessToken: string): Promise<AdAccount[]> {
    const res = await fetch(
      `${LINKEDIN_API}/adAccountsV2?q=search&search=(status:(values:List(ACTIVE)))`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      },
    );

    if (!res.ok) throw new Error(`LinkedIn getAdAccounts failed: ${res.status}`);

    const json = await res.json();
    return (json.elements ?? []).map(
      (acc: Record<string, unknown>) => ({
        id: String(acc.id ?? ''),
        name: String(acc.name ?? ''),
        currency: String(acc.currency ?? ''),
        status: String(acc.status ?? ''),
      }),
    );
  }

  // ── Campaigns ───────────────────────────────────────────────────────────

  async getCampaigns(accessToken: string, adAccountId: string): Promise<Campaign[]> {
    // 1) List campaigns
    const listRes = await fetch(
      `${LINKEDIN_API}/adCampaignsV2?q=search&search=(account:(values:List(urn:li:sponsoredAccount:${adAccountId})))`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      },
    );

    if (!listRes.ok) throw new Error(`LinkedIn listCampaigns failed: ${listRes.status}`);
    const listJson = await listRes.json();
    const campaigns = listJson.elements ?? [];

    // 2) Get analytics data
    const now = new Date();
    const analyticsUrl = new URL(`${LINKEDIN_API}/adAnalyticsV2`);
    analyticsUrl.searchParams.set('q', 'analytics');
    analyticsUrl.searchParams.set('pivot', 'CAMPAIGN');
    analyticsUrl.searchParams.set('dateRange.start.month', String(now.getMonth() + 1));
    analyticsUrl.searchParams.set('dateRange.start.year', String(now.getFullYear()));
    analyticsUrl.searchParams.set('dateRange.start.day', '1');
    analyticsUrl.searchParams.set('dateRange.end.month', String(now.getMonth() + 1));
    analyticsUrl.searchParams.set('dateRange.end.year', String(now.getFullYear()));
    analyticsUrl.searchParams.set('dateRange.end.day', String(now.getDate()));
    analyticsUrl.searchParams.set('timeGranularity', 'MONTHLY');
    analyticsUrl.searchParams.set('accounts', `urn:li:sponsoredAccount:${adAccountId}`);

    const analyticsRes = await fetch(analyticsUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    const metricsMap = new Map<string, Record<string, unknown>>();
    if (analyticsRes.ok) {
      const analyticsJson = await analyticsRes.json();
      for (const el of analyticsJson.elements ?? []) {
        if (el.pivotValue) {
          metricsMap.set(String(el.pivotValue), el);
        }
      }
    }

    return campaigns.map((c: Record<string, unknown>) => {
      const urn = `urn:li:sponsoredCampaign:${c.id}`;
      const m = metricsMap.get(urn) ?? {};
      return {
        id: String(c.id ?? ''),
        name: String(c.name ?? ''),
        status: String(c.status ?? ''),
        objective: String(c.objectiveType ?? ''),
        dailyBudget: c.dailyBudget ? Number((c.dailyBudget as Record<string, unknown>).amount) / 100 : undefined,
        spend: Math.round(parseFloat(String((m as Record<string, unknown>).costInLocalCurrency ?? '0'))),
        impressions: Number((m as Record<string, unknown>).impressions ?? 0),
        clicks: Number((m as Record<string, unknown>).clicks ?? 0),
        conversions: Number(
          (m as Record<string, unknown>).externalWebsiteConversions ??
            (m as Record<string, unknown>).oneClickLeads ??
            0,
        ),
      } satisfies Campaign;
    });
  }

  // ── Server-Side Tracking (Conversions API) ──────────────────────────────

  async sendServerEvent(
    accessToken: string,
    conversionRuleId: string,
    event: TrackingEvent,
  ): Promise<TrackingResult> {
    const payload = {
      conversion: `urn:lla:llaPartnerConversion:${conversionRuleId}`,
      conversionHappenedAt: (event.eventTime ?? Math.floor(Date.now() / 1000)) * 1000,
      conversionValue: event.customData?.value
        ? {
            currencyCode: event.customData.currency ?? 'CLP',
            amount: String(event.customData.value),
          }
        : undefined,
      eventId: event.eventId,
      user: {
        userIds: [
          ...(event.userData.email
            ? [{ idType: 'SHA256_EMAIL', idValue: event.userData.email }]
            : []),
        ],
        userInfo: {
          firstName: undefined,
          lastName: undefined,
        },
      },
    };

    try {
      const res = await fetch(`${REST_API}/conversionEvents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': '202401',
        },
        body: JSON.stringify({ elements: [payload] }),
      });

      if (!res.ok) {
        const body = await res.text();
        return { platform: 'LINKEDIN', success: false, eventId: event.eventId, error: body };
      }

      return { platform: 'LINKEDIN', success: true, eventId: event.eventId };
    } catch (err) {
      return {
        platform: 'LINKEDIN',
        success: false,
        eventId: event.eventId,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}
