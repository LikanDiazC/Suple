/**
 * Marketing module shared types.
 *
 * Used across the service layer, API routes and frontend components.
 */

// ── Platform enum (mirrors Prisma but usable without Prisma import) ────────

export type MarketingPlatform = 'META' | 'TIKTOK' | 'GOOGLE_ADS' | 'LINKEDIN';

export type ConnectionStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'ERROR';

// ── Connection (safe for frontend — no tokens) ────────────────────────────

export interface MarketingConnectionDTO {
  id: string;
  platform: MarketingPlatform;
  adAccountId: string | null;
  adAccountName: string | null;
  status: ConnectionStatus;
  tokenExpiresAt: string | null; // ISO date
  scopes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── OAuth ──────────────────────────────────────────────────────────────────

export interface OAuthStartResult {
  authorizeUrl: string;
  state: string; // CSRF token
}

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number; // seconds until expiry
  scope?: string;
}

// ── Ad Account ─────────────────────────────────────────────────────────────

export interface AdAccount {
  id: string;
  name: string;
  currency?: string;
  timezone?: string;
  status?: string;
}

// ── Campaign ───────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  startDate?: string;
  endDate?: string;
}

export interface CampaignSummary {
  campaigns: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  mock: boolean;
}

// ── Server-Side Tracking ───────────────────────────────────────────────────

export interface TrackingEvent {
  eventId: string;       // Client-generated UUID for dedup
  eventName: string;     // "Purchase", "Lead", "AddToCart", etc.
  eventTime?: number;    // Unix timestamp (defaults to now)
  userData: {
    email?: string;      // Hashed before sending
    phone?: string;      // Hashed before sending
    ip?: string;
    userAgent?: string;
    fbc?: string;        // Facebook click ID
    fbp?: string;        // Facebook browser ID
    ttclid?: string;     // TikTok click ID
  };
  customData?: {
    currency?: string;
    value?: number;
    contentIds?: string[];
    contentType?: string;
    [key: string]: unknown;
  };
  sourceUrl?: string;
}

export interface TrackingResult {
  platform: MarketingPlatform;
  success: boolean;
  eventId: string;
  error?: string;
  deduplicated?: boolean;
}

// ── Service Interface ──────────────────────────────────────────────────────

export interface IMarketingService {
  readonly platform: MarketingPlatform;

  /** Build the OAuth 2.0 authorization URL for this platform. */
  getAuthUrl(redirectUri: string, state: string): string;

  /** Exchange an authorization code for tokens. */
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenSet>;

  /** Refresh an expired access token. */
  refreshToken(refreshToken: string): Promise<OAuthTokenSet>;

  /** List all ad accounts the connected user has access to. */
  getAdAccounts(accessToken: string): Promise<AdAccount[]>;

  /** Fetch campaign performance data for the current period. */
  getCampaigns(accessToken: string, adAccountId: string): Promise<Campaign[]>;

  /** Send a server-side conversion event. */
  sendServerEvent(
    accessToken: string,
    pixelId: string,
    event: TrackingEvent,
  ): Promise<TrackingResult>;
}
