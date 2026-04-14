import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// RUT validation (Mod-11 algorithm — Chilean SII standard)
// ---------------------------------------------------------------------------

function calcDv(body: string): string {
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const r = 11 - (sum % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}

function validateRut(raw: string): boolean {
  const cleaned = raw.replace(/[\.\-\s]/g, '').toUpperCase();
  if (cleaned.length < 2) return false;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  return dv === calcDv(body);
}

// ---------------------------------------------------------------------------
// POST /api/sii/auth
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rut, method, password } = body as {
      rut?: string;
      method?: 'clave_unica' | 'clave_tributaria';
      password?: string;
    };

    // Validate required fields
    if (!rut || !method) {
      return NextResponse.json(
        { error: 'Missing required fields: rut, method' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (method !== 'clave_unica' && method !== 'clave_tributaria') {
      return NextResponse.json(
        {
          error:
            'Invalid method. Must be "clave_unica" or "clave_tributaria"',
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // Validate RUT format
    if (!validateRut(rut)) {
      return NextResponse.json(
        { error: 'Invalid RUT format' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // -----------------------------------------------------------------------
    // Clave Unica — OAuth redirect
    // -----------------------------------------------------------------------
    if (method === 'clave_unica') {
      const clientId = process.env.CLAVE_UNICA_CLIENT_ID;
      const redirectUri = process.env.CLAVE_UNICA_REDIRECT_URI;

      if (!clientId || !redirectUri) {
        return NextResponse.json(
          {
            error:
              'Clave Unica is not configured. Set CLAVE_UNICA_CLIENT_ID and CLAVE_UNICA_REDIRECT_URI.',
            mock: true,
          },
          { status: 200, headers: { 'Cache-Control': 'no-store' } },
        );
      }

      const state = crypto.randomBytes(16).toString('hex');

      const authUrl =
        `https://accounts.claveunica.gob.cl/openid/authorize` +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent('openid run name')}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${state}`;

      const response = NextResponse.json(
        { redirectUrl: authUrl, state },
        { headers: { 'Cache-Control': 'no-store' } },
      );

      // Persist state in a secure httpOnly cookie for CSRF verification
      response.cookies.set('sii_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 600, // 10 minutes
      });

      return response;
    }

    // -----------------------------------------------------------------------
    // Clave Tributaria — SII session proxy
    // -----------------------------------------------------------------------
    if (method === 'clave_tributaria') {
      if (!password) {
        return NextResponse.json(
          { error: 'Password is required for clave_tributaria' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        );
      }

      const siiProxyEnabled =
        process.env.SII_PROXY_ENABLED === 'true';

      if (siiProxyEnabled) {
        // In production: proxy authentication to SII
        // POST to https://zeus.sii.cl/cgi_AUT2000/CAutInicio.cgi
        // NEVER store the password — use it once and discard
        const formData = new URLSearchParams();
        formData.append('rut', rut.replace(/[\.\-]/g, '').slice(0, -1));
        formData.append('dv', rut.replace(/[\.\-\s]/g, '').toUpperCase().slice(-1));
        formData.append('referencia', 'https://homer.sii.cl');
        formData.append('411', password);

        const siiRes = await fetch(
          'https://zeus.sii.cl/cgi_AUT2000/CAutInicio.cgi',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
            redirect: 'manual',
          },
        );

        // Extract session cookie from SII response
        const setCookieHeader = siiRes.headers.get('set-cookie') ?? '';
        const tokenMatch = setCookieHeader.match(/TOKEN=([^;]+)/);

        if (!tokenMatch) {
          return NextResponse.json(
            {
              error: 'SII authentication failed',
              detail: 'Could not obtain session token',
            },
            { status: 401, headers: { 'Cache-Control': 'no-store' } },
          );
        }

        // Password is NOT stored — it was used for the fetch above and
        // now goes out of scope.

        const sessionToken = tokenMatch[1];
        const response = NextResponse.json(
          { authenticated: true, rut, mock: false },
          { headers: { 'Cache-Control': 'no-store' } },
        );

        response.cookies.set('sii_session', sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 1800, // 30 minutes
        });

        return response;
      }

      // SII proxy not enabled — mock session
      // Password is NOT stored.
      const mockToken = crypto.randomBytes(24).toString('hex');
      const response = NextResponse.json(
        { authenticated: true, rut, mock: true },
        { headers: { 'Cache-Control': 'no-store' } },
      );

      response.cookies.set('sii_session', mockToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 1800,
      });

      return response;
    }

    return NextResponse.json(
      { error: 'Unhandled auth method' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', detail: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
