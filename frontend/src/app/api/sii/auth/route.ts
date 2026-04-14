import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// GET /api/sii/auth?tipo=emitidas&periodo=202604
// Reads session cookies and proxies the facturas request to NestJS.
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const siiSession = request.cookies.get('sii_session')?.value;
    const rut = request.cookies.get('sii_rut')?.value;

    if (!siiSession || !rut) {
      return NextResponse.json(
        { error: 'Not authenticated. Please log in.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const { searchParams } = request.nextUrl;
    const tipo = searchParams.get('tipo') ?? 'emitidas';
    const rawPeriodo = searchParams.get('periodo'); // Can be '2026-04' or '202604'

    // Normalize to AAAAMM (strip dash if present)
    const periodo = rawPeriodo ? rawPeriodo.replace('-', '') : '';

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

    const backendRes = await fetch(
      `${backendUrl}/api/sii/facturas?tipo=${tipo}&rut=${encodeURIComponent(rut)}&periodo=${periodo}`,
      {
        headers: { 'x-sii-session': siiSession },
        cache: 'no-store',
      },
    );

    if (!backendRes.ok) {
      const err = await backendRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.message ?? `Backend returned ${backendRes.status}` },
        { status: backendRes.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const data = await backendRes.json();

    return NextResponse.json(
      { facturas: data, tipo, periodo: rawPeriodo ?? periodo, mock: false },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', detail: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/sii/auth
// Authenticates with SII via NestJS backend and sets session cookies.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { rut?: string; password?: string };
    const { rut, password } = body;

    if (!rut || !password) {
      return NextResponse.json(
        { error: 'RUT y contraseña son requeridos.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

    // Forward the real browser IP so NestJS rate-limits per end-user,
    // not per Next.js proxy IP (which would be shared by all users).
    const clientIp =
      request.headers.get('x-real-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      '127.0.0.1';

    const backendRes = await fetch(`${backendUrl}/api/sii/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': clientIp,
      },
      body: JSON.stringify({ rut, password }),
      cache: 'no-store',
    });

    if (!backendRes.ok) {
      const err = await backendRes.json().catch(() => ({}));

      // Rate limit exceeded — give a human-readable message with retry info
      if (backendRes.status === 429) {
        return NextResponse.json(
          { error: 'Demasiados intentos fallidos. Espera 15 minutos e intenta de nuevo.' },
          { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': '900' } },
        );
      }

      // NestJS validation errors use 'message' field; auth errors may also use 'message'
      const errorMsg =
        Array.isArray(err?.message) ? err.message.join(', ') :
        (err?.message ?? `Error de autenticación SII (${backendRes.status}).`);
      return NextResponse.json(
        { error: errorMsg },
        { status: backendRes.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const data = await backendRes.json() as {
      sessionToken: string;
      expiresAt: string;
      rutMasked: string;
    };

    const maxAge = 30 * 60; // 30 minutes — matches SII session TTL
    const isProduction = process.env.NODE_ENV === 'production';

    const response = NextResponse.json(
      { success: true, rutMasked: data.rutMasked, expiresAt: data.expiresAt },
      { headers: { 'Cache-Control': 'no-store' } },
    );

    response.cookies.set('sii_session', data.sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    // Store the formatted RUT (with dots and dash) for use in subsequent API calls
    response.cookies.set('sii_rut', rut, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', detail: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/sii/auth
// Clears session cookies (logout).
// ---------------------------------------------------------------------------

export async function DELETE(_request: NextRequest) {
  const response = NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store' } },
  );
  response.cookies.delete('sii_session');
  response.cookies.delete('sii_rut');
  return response;
}
