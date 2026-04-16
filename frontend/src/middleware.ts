import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/** Must match the cookie name in @/lib/demoMode (inlined to avoid Edge-incompatible imports). */
const DEMO_COOKIE = 'demo_mode';

export async function middleware(request: NextRequest) {
  // Demo mode: allow through when the demo cookie is set
  const isDemo = request.cookies.get(DEMO_COOKIE)?.value === 'true';
  if (isDemo) {
    return NextResponse.next();
  }

  // Authenticated mode: require a valid JWT
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
