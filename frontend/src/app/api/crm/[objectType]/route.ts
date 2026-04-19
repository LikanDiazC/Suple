import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, backendHeaders } from '@/lib/apiProxy';

/**
 * /api/crm/[objectType]
 *
 * GET  → list records (paginated, sorted, filtered)
 * POST → create record
 *
 * Proxies to NestJS `@Controller('api/crm')` → `:objectType`.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ objectType: string }> },
): Promise<NextResponse> {
  const { objectType } = await params;
  const qs = req.nextUrl.searchParams.toString();
  const url = `${BACKEND_URL}/api/crm/${objectType}${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    headers: backendHeaders(req),
    cache: 'no-store',
  });

  if (res.status === 401) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[CRM GET] ${objectType} ${res.status}: ${text}`);
    return NextResponse.json({ error: text || res.statusText }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ objectType: string }> },
): Promise<NextResponse> {
  const { objectType } = await params;
  const body = await req.json().catch(() => ({}));

  const res = await fetch(`${BACKEND_URL}/api/crm/${objectType}`, {
    method: 'POST',
    headers: backendHeaders(req),
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[CRM POST] ${objectType} ${res.status}: ${text}`);
    return NextResponse.json({ error: text || res.statusText }, { status: res.status });
  }
  return NextResponse.json(await res.json(), { status: res.status });
}
