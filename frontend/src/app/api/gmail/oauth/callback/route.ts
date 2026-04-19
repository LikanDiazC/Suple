import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/apiProxy';

/**
 * Google OAuth2 callback — NOT a standard proxy: Google redirects the
 * browser here with ?code=&state=, we forward server-side to the backend
 * (which performs the token exchange), and the backend responds with a
 * 302 redirect to /dashboard/crm/inbox?connected=1.
 *
 * We follow that redirect ourselves (manual: 'manual') and pass it
 * through to the user's browser so the cookie boundaries stay clean.
 */
export async function GET(req: NextRequest): Promise<NextResponse | Response> {
  const qs = req.nextUrl.searchParams.toString();
  const url = `${BACKEND_URL}/api/gmail/oauth/callback${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, { redirect: 'manual' });

  // If backend redirected (3xx), honour its Location header.
  const location = res.headers.get('location');
  if (res.status >= 300 && res.status < 400 && location) {
    return NextResponse.redirect(location);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[Gmail/oauth/callback] ${res.status}: ${text}`);
    return NextResponse.redirect(new URL('/dashboard/crm/inbox?connected=0', req.url));
  }

  // Fallback: success without redirect — send user to inbox.
  return NextResponse.redirect(new URL('/dashboard/crm/inbox?connected=1', req.url));
}
