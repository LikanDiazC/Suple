import { NextRequest, NextResponse } from 'next/server';
import { isDemoRequest } from '@/lib/demoMode';

/**
 * Shared API route proxy helper.
 *
 * Eliminates the 40+ duplicate boilerplate blocks that each API route
 * repeats: BACKEND_URL resolution, x-tenant-id header, useMock() check,
 * try/catch with mock fallback, and console.error logging.
 *
 * Demo mode: when the `demo_mode` cookie is present the proxy always
 * returns the mock data — no backend call is ever made.
 *
 * Usage in a route.ts:
 *
 *   import { proxyGet, proxyPost } from '@/lib/apiProxy';
 *   const MOCK = { data: [] };
 *   export const GET  = proxyGet('/api/bpms/definitions', MOCK);
 *   export const POST = proxyPost('/api/bpms/definitions', MOCK);
 */

const BACKEND_URL = process.env.BACKEND_URL ?? '';
const DEFAULT_TENANT = 'tnt_demo01';

function backendHeaders(): Record<string, string> {
  return {
    'x-tenant-id':  DEFAULT_TENANT,
    'Content-Type': 'application/json',
  };
}

function useMock(): boolean {
  return !BACKEND_URL;
}

/** Returns true when the request should use mock data (demo mode OR no backend). */
function shouldMock(req?: NextRequest): boolean {
  if (useMock()) return true;
  if (req && isDemoRequest(req)) return true;
  return false;
}

// ── GET proxy ────────────────────────────────────────────────────────────────

/**
 * Creates a GET handler that proxies to the backend with query-string
 * forwarding and falls back to mockData on failure or when BACKEND_URL
 * is not configured.
 */
export function proxyGet<T>(
  backendPath: string,
  mockData: T,
  options?: {
    /** Transform the backend JSON before returning. */
    transform?: (data: unknown) => unknown;
    /** Tag for console.error (default: path). */
    tag?: string;
  },
) {
  return async function GET(req: NextRequest): Promise<NextResponse> {
    if (shouldMock(req)) {
      return NextResponse.json(mockData);
    }

    try {
      const qs = req.nextUrl.searchParams.toString();
      const url = `${BACKEND_URL}${backendPath}${qs ? `?${qs}` : ''}`;

      const res = await fetch(url, {
        headers: backendHeaders(),
        cache: 'no-store',
      });

      if (!res.ok) throw new Error(`Backend ${res.status}`);
      const json = await res.json();
      return NextResponse.json(options?.transform ? options.transform(json) : json);
    } catch (err) {
      console.error(
        `[${options?.tag ?? backendPath}] GET failed, mock fallback:`,
        (err as Error).message,
      );
      return NextResponse.json(mockData);
    }
  };
}

// ── POST proxy ───────────────────────────────────────────────────────────────

/**
 * Creates a POST handler that proxies the request body to the backend and
 * falls back to mockData on failure.
 */
export function proxyPost<T>(
  backendPath: string,
  mockData: T,
  options?: {
    /** Mock HTTP status code (default 200). */
    mockStatus?: number;
    /** Backend HTTP status code on success (default 200). */
    successStatus?: number;
    tag?: string;
  },
) {
  return async function POST(req: NextRequest): Promise<NextResponse> {
    const body = await req.json().catch(() => ({}));

    if (shouldMock(req)) {
      return NextResponse.json(mockData, { status: options?.mockStatus ?? 200 });
    }

    try {
      const res = await fetch(`${BACKEND_URL}${backendPath}`, {
        method: 'POST',
        headers: backendHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Backend ${res.status}`);
      return NextResponse.json(
        await res.json(),
        { status: options?.successStatus ?? res.status },
      );
    } catch (err) {
      console.error(
        `[${options?.tag ?? backendPath}] POST failed, mock fallback:`,
        (err as Error).message,
      );
      return NextResponse.json(mockData, { status: options?.mockStatus ?? 200 });
    }
  };
}

// ── Dynamic path proxy (for routes with [id] segments) ───────────────────────

/**
 * Proxies a GET request to a dynamic backend path.
 * The caller provides the full backend URL at call time.
 */
export async function proxyDynamicGet<T>(
  backendUrl: string,
  mockData: T,
  tag = 'proxy',
  req?: NextRequest,
): Promise<NextResponse> {
  if (shouldMock(req)) {
    return NextResponse.json(mockData);
  }

  try {
    const res = await fetch(`${BACKEND_URL}${backendUrl}`, {
      headers: backendHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`Backend ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error(`[${tag}] GET failed, mock fallback:`, (err as Error).message);
    return NextResponse.json(mockData);
  }
}

/**
 * Proxies a POST request to a dynamic backend path.
 */
export async function proxyDynamicPost<T>(
  backendUrl: string,
  body: unknown,
  mockData: T,
  tag = 'proxy',
  req?: NextRequest,
): Promise<NextResponse> {
  if (shouldMock(req)) {
    return NextResponse.json(mockData);
  }

  try {
    const res = await fetch(`${BACKEND_URL}${backendUrl}`, {
      method: 'POST',
      headers: backendHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Backend ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error(`[${tag}] POST failed, mock fallback:`, (err as Error).message);
    return NextResponse.json(mockData);
  }
}

// ── Re-exports for convenience ───────────────────────────────────────────────

export { BACKEND_URL, useMock, shouldMock, backendHeaders };
