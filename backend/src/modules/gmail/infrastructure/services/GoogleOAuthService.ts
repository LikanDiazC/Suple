import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import type { OAuth2Client, Credentials } from 'google-auth-library';

/**
 * ==========================================================================
 * Google OAuth2 Service
 * ==========================================================================
 *
 * Thin wrapper around `google.auth.OAuth2` that hides the ceremony of:
 *   - building consent URLs with proper scopes,
 *   - exchanging an authorization code for tokens + user email,
 *   - refreshing short-lived access_tokens.
 *
 * Credentials come from env vars (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
 * GOOGLE_OAUTH_REDIRECT_URI). If they are missing at call-time the service
 * throws a clear error — it is NOT constructed lazily so Nest can always
 * instantiate the module even before the tenant has plugged in credentials.
 * ==========================================================================
 */

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
];

export interface ExchangedTokens {
  tokens: Credentials;
  email: string;
}

@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);

  private buildClient(): OAuth2Client {
    const clientId     = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri  = process.env.GOOGLE_OAUTH_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI in backend/.env.',
      );
    }
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /** Build the Google consent URL for the "connect Gmail" button. */
  getAuthUrl(state: string): string {
    const client = this.buildClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // always return refresh_token
      scope: GMAIL_SCOPES,
      state,
      include_granted_scopes: true,
    });
  }

  /** Exchange ?code= for tokens + the authenticated user's email. */
  async exchangeCode(code: string): Promise<ExchangedTokens> {
    const client = this.buildClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data } = await oauth2.userinfo.get();
    if (!data.email) {
      throw new Error('Google did not return an email for the authorized user.');
    }
    return { tokens, email: data.email };
  }

  /** Force-refresh a short-lived access_token using the stored refresh_token. */
  async refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_at: Date }> {
    const client = this.buildClient();
    client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await client.refreshAccessToken();
    if (!credentials.access_token || !credentials.expiry_date) {
      throw new Error('Google did not return a refreshed access_token');
    }
    return {
      access_token: credentials.access_token,
      expires_at: new Date(credentials.expiry_date),
    };
  }

  /** Build an OAuth2Client pre-seeded with a user's stored credentials. */
  getAuthenticatedClient(connection: {
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
  }): OAuth2Client {
    const client = this.buildClient();
    client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
      expiry_date: connection.tokenExpiresAt.getTime(),
    });
    return client;
  }
}
