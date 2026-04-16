/**
 * Google Ads Marketing Service.
 *
 * - OAuth 2.0:   Google OAuth 2.0 for Web Server Apps
 * - Campaigns:   Google Ads API v16
 * - Tracking:    Offline conversions import (Google Ads API)
 */

import type {
  IMarketingService,
  OAuthTokenSet,
  AdAccount,
  Campaign,
  TrackingEvent,
  TrackingResult,
} from './types';

const GOOGLE_ADS_API = 'https://googleads.googleapis.com/v16';

export class GoogleAdsService implements IMarketingService {
  readonly platform = 'GOOGLE_ADS' as const;

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly developerToken: string;

  constructor() {
    // Reutiliza las mismas credenciales OAuth de Google que ya se usan
    // para login/Gmail. Solo se necesita agregar la API de Google Ads
    // en la biblioteca del mismo proyecto de Google Cloud Console.
    this.clientId = process.env.GOOGLE_ADS_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? '';
    this.clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? '';
    this.developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? '';
  }

  // ── OAuth ───────────────────────────────────────────────────────────────

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/adwords',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenSet> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!res.ok) throw new Error(`Google Ads token exchange failed: ${res.status}`);

    const json = await res.json();
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in ?? 3600,
      scope: json.scope,
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokenSet> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) throw new Error(`Google Ads token refresh failed: ${res.status}`);

    const json = await res.json();
    return {
      accessToken: json.access_token,
      expiresIn: json.expires_in ?? 3600,
    };
  }

  // ── Ad Accounts (Customer IDs) ──────────────────────────────────────────

  async getAdAccounts(accessToken: string): Promise<AdAccount[]> {
    // Google Ads uses "customers" instead of "ad accounts".
    // ListAccessibleCustomers returns all customer IDs the token can access.
    const res = await fetch(
      `${GOOGLE_ADS_API}/customers:listAccessibleCustomers`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': this.developerToken,
        },
      },
    );

    if (!res.ok) throw new Error(`Google Ads getAdAccounts failed: ${res.status}`);

    const json = await res.json();
    const customerResourceNames: string[] = json.resourceNames ?? [];

    return customerResourceNames.map((rn) => {
      const id = rn.replace('customers/', '');
      return {
        id,
        name: `Customer ${id}`,
        status: 'ACTIVE',
      };
    });
  }

  // ── Campaigns ───────────────────────────────────────────────────────────

  async getCampaigns(accessToken: string, customerId: string): Promise<Campaign[]> {
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM campaign
      WHERE segments.date DURING THIS_MONTH
        AND campaign.status != 'REMOVED'
    `.trim();

    const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

    const res = await fetch(
      `${GOOGLE_ADS_API}/customers/${customerId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'developer-token': this.developerToken,
          ...(loginCustomerId ? { 'login-customer-id': loginCustomerId } : {}),
        },
        body: JSON.stringify({ query }),
      },
    );

    if (!res.ok) throw new Error(`Google Ads getCampaigns failed: ${res.status}`);

    const json = await res.json();
    const rows = json[0]?.results ?? [];

    return rows.map((row: Record<string, Record<string, string>>) => ({
      id: String(row.campaign?.id ?? ''),
      name: String(row.campaign?.name ?? ''),
      status: String(row.campaign?.status ?? ''),
      objective: String(row.campaign?.advertisingChannelType ?? ''),
      spend: Math.round(parseInt(row.metrics?.costMicros ?? '0', 10) / 1_000_000),
      impressions: parseInt(row.metrics?.impressions ?? '0', 10),
      clicks: parseInt(row.metrics?.clicks ?? '0', 10),
      conversions: Math.round(parseFloat(row.metrics?.conversions ?? '0')),
    }));
  }

  // ── Server-Side Tracking (Offline Conversions) ──────────────────────────

  async sendServerEvent(
    accessToken: string,
    conversionActionId: string,
    event: TrackingEvent,
  ): Promise<TrackingResult> {
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID ?? '';

    const conversionPayload = {
      conversions: [
        {
          conversionAction: `customers/${customerId}/conversionActions/${conversionActionId}`,
          conversionDateTime: new Date(
            (event.eventTime ?? Math.floor(Date.now() / 1000)) * 1000,
          )
            .toISOString()
            .replace('T', ' ')
            .replace('Z', '+00:00'),
          conversionValue: event.customData?.value ?? 0,
          currencyCode: event.customData?.currency ?? 'CLP',
          orderId: event.eventId,
        },
      ],
      partialFailure: true,
    };

    try {
      const res = await fetch(
        `${GOOGLE_ADS_API}/customers/${customerId}:uploadClickConversions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'developer-token': this.developerToken,
          },
          body: JSON.stringify(conversionPayload),
        },
      );

      if (!res.ok) {
        const body = await res.text();
        return { platform: 'GOOGLE_ADS', success: false, eventId: event.eventId, error: body };
      }

      return { platform: 'GOOGLE_ADS', success: true, eventId: event.eventId };
    } catch (err) {
      return {
        platform: 'GOOGLE_ADS',
        success: false,
        eventId: event.eventId,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}
