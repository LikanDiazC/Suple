import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, backendHeaders } from '@/lib/apiProxy';

type Params = { params: Promise<{ id: string }> };

function unauthorizedRedirect(req: NextRequest): NextResponse {
  return NextResponse.redirect(new URL('/login', req.url));
}

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;

  const res = await fetch(`${BACKEND_URL}/api/crm/deals/${id}/activities`, {
    headers: backendHeaders(req),
    cache: 'no-store',
  });

  if (res.status === 401) return unauthorizedRedirect(req);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[CRM activities] GET ${id} ${res.status}: ${text}`);
    return NextResponse.json({ error: text || res.statusText }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const res = await fetch(`${BACKEND_URL}/api/crm/deals/${id}/activities`, {
    method: 'POST',
    headers: backendHeaders(req),
    body: JSON.stringify(body),
  });

  if (res.status === 401) return unauthorizedRedirect(req);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[CRM activities] POST ${id} ${res.status}: ${text}`);
    return NextResponse.json({ error: text || res.statusText }, { status: res.status });
  }
  return NextResponse.json(await res.json(), { status: 201 });
}
