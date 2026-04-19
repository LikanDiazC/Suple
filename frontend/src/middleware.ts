import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge middleware: only checks for cookie presence.
 * Full validation (signature, expiry) happens in the backend
 * via the JwtAuthGuard. The /api/auth/me route also re-checks
 * expiry for client-side rehydration.
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get('suple_token')?.value;
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
