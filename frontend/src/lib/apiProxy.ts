import { NextRequest, NextResponse } from 'next/server';

/**
 * Shared API route proxy helper.
 *
 * Proxies all requests to the NestJS backend, propagating the user's JWT
 * from the HttpOnly `suple_token` cookie. No mock fallback, no demo mode,
 * no hardcoded tenant — the backend resolves the tenant from the JWT.
 *
 * On 401: the proxy returns a redirect to /login.
 *
 * Usage in a route.ts:
 *
 *   import { proxyGet, proxyPost } from '@/lib/apiProxy';
 *   export const GET  = proxyGet('/api/bpms/definitions');
 *   export const POST = proxyPost('/api/bpms/definitions');
 */

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';

function backendHeaders(req: NextRequest): Record<string, string> {
  const token = req.cookies.get('suple_token')?.value;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function unauthorizedRedirect(req: NextRequest): NextResponse {
  return NextResponse.redirect(new URL('/login', req.url));
}

// ── GET proxy ────────────────────────────────────────────────────────────────

export function proxyGet(
  backendPath: string,
  options?: {
    transform?: (data: unknown) => unknown;
    tag?: string;
  },
) {
  return async function GET(req: NextRequest): Promise<NextResponse> {
    const qs = req.nextUrl.searchParams.toString();
    const url = `${BACKEND_URL}${backendPath}${qs ? `?${qs}` : ''}`;

    const res = await fetch(url, {
      headers: backendHeaders(req),
      cache: 'no-store',
    });

    if (res.status === 401) return unauthorizedRedirect(req);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[${options?.tag ?? backendPath}] GET ${res.status}: ${text}`);
      return NextResponse.json({ error: text || res.statusText }, { status: res.status });
    }

    const json = await res.json();
    return NextResponse.json(options?.transform ? options.transform(json) : json);
  };
}

// ── POST proxy ───────────────────────────────────────────────────────────────

export function proxyPost(
  backendPath: string,
  options?: {
    successStatus?: number;
    tag?: string;
  },
) {
  return async function POST(req: NextRequest): Promise<NextResponse> {
    const body = await req.json().catch(() => ({}));

    const res = await fetch(`${BACKEND_URL}${backendPath}`, {
      method: 'POST',
      headers: backendHeaders(req),
      body: JSON.stringify(body),
    });

    if (res.status === 401) return unauthorizedRedirect(req);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[${options?.tag ?? backendPath}] POST ${res.status}: ${text}`);
      return NextResponse.json({ error: text || res.statusText }, { status: res.status });
    }

    return NextResponse.json(
      await res.json(),
      { status: options?.successStatus ?? res.status },
    );
  };
}

// ── Dynamic path proxy (for routes with [id] segments) ───────────────────────

export async function proxyDynamicGet(
  backendPath: string,
  req: NextRequest,
  tag = 'proxy',
): Promise<NextResponse> {
  const res = await fetch(`${BACKEND_URL}${backendPath}`, {
    headers: backendHeaders(req),
    cache: 'no-store',
  });

  if (res.status === 401) return unauthorizedRedirect(req);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[${tag}] GET ${res.status}: ${text}`);
    return NextResponse.json({ error: text || res.statusText }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}

export async function proxyDynamicPost(
  backendPath: string,
  body: unknown,
  req: NextRequest,
  tag = 'proxy',
): Promise<NextResponse> {
  const res = await fetch(`${BACKEND_URL}${backendPath}`, {
    method: 'POST',
    headers: backendHeaders(req),
    body: JSON.stringify(body),
  });

  if (res.status === 401) return unauthorizedRedirect(req);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[${tag}] POST ${res.status}: ${text}`);
    return NextResponse.json({ error: text || res.statusText }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}

export async function proxyDynamicPut(
  backendPath: string,
  body: unknown,
  req: NextRequest,
  tag = 'proxy',
): Promise<NextResponse> {
  const res = await fetch(`${BACKEND_URL}${backendPath}`, {
    method: 'PUT',
    headers: backendHeaders(req),
    body: JSON.stringify(body),
  });

  if (res.status === 401) return unauthorizedRedirect(req);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[${tag}] PUT ${res.status}: ${text}`);
    return NextResponse.json({ error: text || res.statusText }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}

export async function proxyDynamicDelete(
  backendPath: string,
  req: NextRequest,
  tag = 'proxy',
): Promise<NextResponse> {
  const res = await fetch(`${BACKEND_URL}${backendPath}`, {
    method: 'DELETE',
    headers: backendHeaders(req),
  });

  if (res.status === 401) return unauthorizedRedirect(req);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[${tag}] DELETE ${res.status}: ${text}`);
    return NextResponse.json({ error: text || res.statusText }, { status: res.status });
  }
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(await res.json());
}

export { BACKEND_URL, backendHeaders };
