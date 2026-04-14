import { type AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const providers: AuthOptions['providers'] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/contacts.readonly',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  );
}

/**
 * Refreshes the Google access token using the stored refresh token.
 * Returns updated token fields on success, or the original token with
 * error: 'RefreshAccessTokenError' on failure.
 */
async function refreshGoogleToken(token: Record<string, unknown>) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type:    'refresh_token',
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshed = await response.json() as {
      access_token: string;
      expires_in:   number;
      error?:       string;
    };

    if (!response.ok) {
      throw new Error(refreshed.error ?? `Token refresh HTTP ${response.status}`);
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      // New expiry: current time + expires_in (usually 3600 s), stored as Unix seconds
      expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
      error: undefined, // clear any previous error
    };
  } catch (err) {
    console.error('[Auth] Google token refresh failed:', err);
    // Signal to API routes that they should return 401
    return { ...token, error: 'RefreshAccessTokenError' as const };
  }
}

export const authOptions: AuthOptions = {
  providers,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // ── Initial sign-in: store tokens + expiry from Google ─────────────────
      if (account) {
        token.accessToken  = account.access_token;
        token.refreshToken = account.refresh_token;
        // expires_at is a Unix timestamp in seconds provided by Google
        token.expiresAt    = account.expires_at;
      }
      if (profile) {
        token.name    = profile.name;
        token.email   = profile.email;
        token.picture = (profile as { picture?: string }).picture;
      }

      // ── Subsequent calls: check if the access token needs refreshing ────────
      const nowSeconds = Math.floor(Date.now() / 1000);
      const expiresAt  = token.expiresAt as number | undefined;

      // Still valid with at least 60 seconds of buffer — return as-is
      if (!expiresAt || nowSeconds < expiresAt - 60) {
        return token;
      }

      // Token has expired (or will expire in < 60 s) — refresh it
      if (!token.refreshToken) {
        // No refresh token stored — user needs to sign in again
        return { ...token, error: 'RefreshAccessTokenError' as const };
      }

      return refreshGoogleToken(token as Record<string, unknown>);
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      // Expose error to client so it can redirect to /login if needed
      if (token.error) {
        (session as Record<string, unknown>).error = token.error;
      }
      if (session.user) {
        session.user.name  = token.name  as string;
        session.user.email = token.email as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
};
