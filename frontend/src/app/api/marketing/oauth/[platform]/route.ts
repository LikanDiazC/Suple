/**
 * GET /api/marketing/oauth/[platform]
 *
 * Initiates the OAuth 2.0 flow for a marketing platform.
 * Generates a CSRF state token, stores it in a cookie, and redirects
 * the user to the platform's authorization page.
 *
 * Supported platforms: meta, tiktok, google-ads, linkedin
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getToken } from 'next-auth/jwt';
import { getMarketingService, slugToPlatform } from '@/application/services/marketing';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform: slug } = await params;
  const platform = slugToPlatform(slug);

  if (!platform) {
    return NextResponse.json(
      { error: `Unsupported platform: ${slug}` },
      { status: 400 },
    );
  }

  // Require authentication
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Generate CSRF state
  const state = randomBytes(32).toString('hex');

  // Build redirect URI — use NEXTAUTH_URL as canonical base so it always
  // matches the URI registered in the platform's OAuth console, regardless
  // of which port the dev server happens to be running on.
  const baseUrl = process.env.NEXTAUTH_URL ?? request.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/marketing/oauth/${slug}/callback`;

  // Get the authorize URL from the platform service
  const service = getMarketingService(platform);
  const authorizeUrl = service.getAuthUrl(redirectUri, state);

  // Store state in a short-lived cookie for CSRF validation on callback
  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: `/api/marketing/oauth/${slug}/callback`,
  });

  // Also store the user email for the callback to look up the user
  response.cookies.set('oauth_user_email', token.email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: `/api/marketing/oauth/${slug}/callback`,
  });

  return response;
}
