/**
 * GET /api/marketing/oauth/[platform]/callback
 *
 * Generic OAuth 2.0 callback handler.
 *
 * Flow:
 * 1. Validate CSRF state from cookie vs query param.
 * 2. Exchange the authorization code for tokens (platform-specific).
 * 3. Encrypt tokens and store in the MarketingConnection table.
 * 4. Redirect the user to the marketing connections page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { getMarketingService, slugToPlatform } from '@/application/services/marketing';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform: slug } = await params;

  // Hard 20s timeout for the whole callback — prevents browser from hanging
  const timeout = new Promise<NextResponse>((resolve) =>
    setTimeout(() => {
      console.error(`[OAuth:${slug}] Callback timeout after 20s`);
      resolve(redirectWithError('Callback timeout — please try again', request));
    }, 20000),
  );

  return Promise.race([handleCallback(request, slug), timeout]);
}

async function handleCallback(request: NextRequest, slug: string): Promise<NextResponse> {
  const platform = slugToPlatform(slug);

  if (!platform) {
    return redirectWithError('Unsupported platform', request);
  }

  const { searchParams } = request.nextUrl;

  // ── Check for error from the provider ────────────────────────────────
  const oauthError = searchParams.get('error');
  if (oauthError) {
    const desc = searchParams.get('error_description') ?? oauthError;
    return redirectWithError(desc, request);
  }

  // ── CSRF validation ──────────────────────────────────────────────────
  const stateParam = searchParams.get('state');
  const stateCookie = request.cookies.get('oauth_state')?.value;

  if (!stateParam || !stateCookie || stateParam !== stateCookie) {
    return redirectWithError('Invalid OAuth state — please try again', request);
  }

  // ── Get user email from cookie ───────────────────────────────────────
  const userEmail = request.cookies.get('oauth_user_email')?.value;
  if (!userEmail) {
    return redirectWithError('Session expired — please log in again', request);
  }

  // ── Exchange code for tokens ─────────────────────────────────────────
  const code = searchParams.get('code');
  if (!code) {
    return redirectWithError('No authorization code received', request);
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? request.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/marketing/oauth/${slug}/callback`;

  const service = getMarketingService(platform);

  let tokenSet;
  try {
    console.log(`[OAuth:${slug}] Exchanging code for tokens. redirectUri=${redirectUri}`);
    tokenSet = await service.exchangeCode(code, redirectUri);
    console.log(`[OAuth:${slug}] Token exchange OK. hasRefreshToken=${!!tokenSet.refreshToken} expiresIn=${tokenSet.expiresIn}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Token exchange failed';
    console.error(`[OAuth:${slug}] Token exchange FAILED: ${msg}`);
    return redirectWithError(msg, request);
  }

  // ── Find or create the user ──────────────────────────────────────────
  let user = await prisma.user.findUnique({ where: { email: userEmail } });

  if (!user) {
    // Auto-create user record on first marketing connection
    user = await prisma.user.create({
      data: {
        email: userEmail,
        name: userEmail.split('@')[0],
        tenantId: deriveTenantId(userEmail),
      },
    });
  }

  // ── Skip getAdAccounts in callback (requires Google Ads API enabled + approved dev token)
  // Ad account ID can be populated later via a dedicated settings flow.
  const adAccountId: string | null = null;
  const adAccountName: string | null = null;
  console.log(`[OAuth:${slug}] Skipping ad account lookup — storing tokens only`);

  // ── Upsert the connection ────────────────────────────────────────────
  const encryptedAccessToken = encrypt(tokenSet.accessToken);
  const encryptedRefreshToken = tokenSet.refreshToken
    ? encrypt(tokenSet.refreshToken)
    : null;
  const tokenExpiresAt = tokenSet.expiresIn
    ? new Date(Date.now() + tokenSet.expiresIn * 1000)
    : null;

  // SQLite treats NULL as distinct in unique constraints, so we cannot
  // rely on the composite unique key when adAccountId is null.
  // Instead, find-then-update-or-create manually.
  const existingConn = await prisma.marketingConnection.findFirst({
    where: {
      userId: user.id,
      platform,
      ...(adAccountId ? { adAccountId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existingConn) {
    await prisma.marketingConnection.update({
      where: { id: existingConn.id },
      data: {
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
        scopes: tokenSet.scope ?? null,
        adAccountId,
        adAccountName,
        status: 'ACTIVE',
      },
    });
  } else {
    await prisma.marketingConnection.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        platform,
        adAccountId,
        adAccountName,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
        scopes: tokenSet.scope ?? null,
        status: 'ACTIVE',
      },
    });
  }

  // ── Clean up cookies and redirect to success page ────────────────────
  const successUrl = new URL('/dashboard/marketing/connections', request.url);
  successUrl.searchParams.set('connected', slug);

  const response = NextResponse.redirect(successUrl);
  response.cookies.delete('oauth_state');
  response.cookies.delete('oauth_user_email');

  return response;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function redirectWithError(message: string, request: NextRequest): NextResponse {
  const errorUrl = new URL('/dashboard/marketing/connections', request.url);
  errorUrl.searchParams.set('error', message);

  const response = NextResponse.redirect(errorUrl);
  response.cookies.delete('oauth_state');
  response.cookies.delete('oauth_user_email');
  return response;
}

/**
 * Derive a tenant ID from the user's email domain.
 * In production this would come from a separate tenant registration flow.
 */
function deriveTenantId(email: string): string {
  const domain = email.split('@')[1] ?? 'default';
  return `tenant_${domain.replace(/\./g, '_')}`;
}
