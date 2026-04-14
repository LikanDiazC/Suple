import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// GET /api/sii/callback — Clave Unica OAuth callback
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      const redirectUrl = new URL('/dashboard/sii', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', error);
      return NextResponse.redirect(redirectUrl);
    }

    if (!code || !state) {
      const redirectUrl = new URL('/dashboard/sii', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', 'missing_code_or_state');
      return NextResponse.redirect(redirectUrl);
    }

    // Verify state matches the cookie to prevent CSRF
    const savedState = request.cookies.get('sii_oauth_state')?.value;
    if (!savedState || savedState !== state) {
      const redirectUrl = new URL('/dashboard/sii', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', 'state_mismatch');
      return NextResponse.redirect(redirectUrl);
    }

    // Exchange authorization code for token
    const clientId = process.env.CLAVE_UNICA_CLIENT_ID;
    const clientSecret = process.env.CLAVE_UNICA_CLIENT_SECRET;
    const redirectUri = process.env.CLAVE_UNICA_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      const redirectUrl = new URL('/dashboard/sii', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', 'server_config');
      return NextResponse.redirect(redirectUrl);
    }

    const tokenRes = await fetch(
      'https://accounts.claveunica.gob.cl/openid/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }).toString(),
      },
    );

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text();
      console.error('[SII callback] Token exchange failed:', errorBody);
      const redirectUrl = new URL('/dashboard/sii', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', 'token_exchange_failed');
      return NextResponse.redirect(redirectUrl);
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;

    // Optionally fetch user info to get the RUT
    let userRut = '';
    try {
      const userInfoRes = await fetch(
        'https://accounts.claveunica.gob.cl/openid/userinfo',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        userRut = userInfo.RolUnico?.numero
          ? `${userInfo.RolUnico.numero}-${userInfo.RolUnico.DV}`
          : '';
      }
    } catch {
      // Non-critical — continue without RUT
    }

    // Build a session payload and store it as a secure httpOnly cookie
    const sessionPayload = JSON.stringify({
      accessToken,
      rut: userRut,
      authenticatedAt: new Date().toISOString(),
      method: 'clave_unica',
    });

    // Base64-encode the session for cookie storage
    const sessionValue = Buffer.from(sessionPayload).toString('base64');

    const redirectUrl = new URL('/dashboard/sii', request.nextUrl.origin);
    const response = NextResponse.redirect(redirectUrl);

    // Set session cookie
    response.cookies.set('sii_session', sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 3600, // 1 hour
    });

    // Clear the OAuth state cookie
    response.cookies.delete('sii_oauth_state');

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('[SII callback] Error:', message);
    const redirectUrl = new URL('/dashboard/sii', request.nextUrl.origin);
    redirectUrl.searchParams.set('error', 'internal');
    return NextResponse.redirect(redirectUrl);
  }
}
