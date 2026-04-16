/**
 * Meta (Facebook / Instagram) Marketing Service.
 *
 * - OAuth 2.0:   Facebook Login for Business
 * - Campaigns:   Marketing API v19.0
 * - Tracking:    Conversions API (CAPI)
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

const GRAPH_API = 'https://graph.facebook.com/v19.0';

export class MetaService implements IMarketingService {
  readonly platform = 'META' as const;

  private readonly appId: string;
  private readonly appSecret: string;

  constructor() {
    this.appId = process.env.META_APP_ID ?? '';
    this.appSecret = process.env.META_APP_SECRET ?? '';
  }

  // ── OAuth ───────────────────────────────────────────────────────────────

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      state,
      scope: 'ads_management,ads_read,business_management',
      response_type: 'code',
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenSet> {
    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      redirect_uri: redirectUri,
      code,
    });

    const res = await fetch(`${GRAPH_API}/oauth/access_token?${params}`);
    if (!res.ok) throw new Error(`Meta token exchange failed: ${res.status}`);

    const json = await res.json();

    // Exchange short-lived token for long-lived token
    const longParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: json.access_token,
    });

    const longRes = await fetch(`${GRAPH_API}/oauth/access_token?${longParams}`);
    if (!longRes.ok) throw new Error(`Meta long-lived token exchange failed: ${longRes.status}`);

    const longJson = await longRes.json();

    return {
      accessToken: longJson.access_token,
      expiresIn: longJson.expires_in ?? 5184000, // ~60 days default
    };
  }

  async refreshToken(_refreshToken: string): Promise<OAuthTokenSet> {
    // Meta long-lived tokens are refreshed by exchanging the current token
    // for a new one (same endpoint as exchangeCode with grant_type=fb_exchange_token).
    throw new Error(
      'Meta tokens cannot be refreshed with a refresh_token. ' +
        'Use the current access token to get a new long-lived token.',
    );
  }

  // ── Ad Accounts ─────────────────────────────────────────────────────────

  async getAdAccounts(accessToken: string): Promise<AdAccount[]> {
    const res = await fetch(
      `${GRAPH_API}/me/adaccounts?fields=id,name,currency,timezone_name,account_status&access_token=${accessToken}`,
    );
    if (!res.ok) throw new Error(`Meta getAdAccounts failed: ${res.status}`);

    const json = await res.json();
    return (json.data ?? []).map(
      (acc: Record<string, unknown>) => ({
        id: String(acc.id ?? '').replace('act_', ''),
        name: String(acc.name ?? ''),
        currency: String(acc.currency ?? ''),
        timezone: String(acc.timezone_name ?? ''),
        status: acc.account_status === 1 ? 'ACTIVE' : 'INACTIVE',
      }),
    );
  }

  // ── Campaigns ───────────────────────────────────────────────────────────

  async getCampaigns(accessToken: string, adAccountId: string): Promise<Campaign[]> {
    const insightsFields = 'impressions,clicks,spend,actions';
    const campaignFields = 'name,status,objective,daily_budget,lifetime_budget,start_time,stop_time';

    const res = await fetch(
      `${GRAPH_API}/act_${adAccountId}/campaigns?fields=${campaignFields},insights.date_preset(this_month){${insightsFields}}&access_token=${accessToken}`,
    );
    if (!res.ok) throw new Error(`Meta getCampaigns failed: ${res.status}`);

    const json = await res.json();
    return (json.data ?? []).map((c: Record<string, unknown>) => {
      const insight = ((c.insights as Record<string, unknown>)?.data as Record<string, unknown>[])?.[0] ?? {};
      const conversionsAction = ((insight.actions as Array<{ action_type: string; value: string }>) ?? [])
        .find((a) => a.action_type === 'offsite_conversion' || a.action_type === 'lead');

      return {
        id: String(c.id),
        name: String(c.name ?? ''),
        status: String(c.status ?? ''),
        objective: String(c.objective ?? ''),
        dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : undefined,
        lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : undefined,
        spend: Math.round(parseFloat(String(insight.spend ?? '0'))),
        impressions: parseInt(String(insight.impressions ?? '0'), 10),
        clicks: parseInt(String(insight.clicks ?? '0'), 10),
        conversions: conversionsAction ? parseInt(conversionsAction.value, 10) : 0,
        startDate: c.start_time ? String(c.start_time) : undefined,
        endDate: c.stop_time ? String(c.stop_time) : undefined,
      } satisfies Campaign;
    });
  }

  // ── Server-Side Tracking (Conversions API) ──────────────────────────────

  async sendServerEvent(
    accessToken: string,
    pixelId: string,
    event: TrackingEvent,
  ): Promise<TrackingResult> {
    const eventData: Record<string, unknown> = {
      event_name: event.eventName,
      event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
      event_id: event.eventId,
      event_source_url: event.sourceUrl,
      action_source: 'website',
      user_data: {
        em: event.userData.email ? [sha256(event.userData.email.toLowerCase().trim())] : undefined,
        ph: event.userData.phone ? [sha256(event.userData.phone.replace(/\D/g, ''))] : undefined,
        client_ip_address: event.userData.ip,
        client_user_agent: event.userData.userAgent,
        fbc: event.userData.fbc,
        fbp: event.userData.fbp,
      },
      custom_data: event.customData
        ? {
            currency: event.customData.currency,
            value: event.customData.value,
            content_ids: event.customData.contentIds,
            content_type: event.customData.contentType,
          }
        : undefined,
    };

    try {
      const res = await fetch(`${GRAPH_API}/${pixelId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [eventData],
          access_token: accessToken,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        return { platform: 'META', success: false, eventId: event.eventId, error: body };
      }

      return { platform: 'META', success: true, eventId: event.eventId };
    } catch (err) {
      return {
        platform: 'META',
        success: false,
        eventId: event.eventId,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
