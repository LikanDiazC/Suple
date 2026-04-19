import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, backendHeaders } from '@/lib/apiProxy';

/**
 * PATCH /api/crm/[objectType]/[id]
 *
 * Proxies a PATCH request to the NestJS backend.
 * Used for partial updates such as setting the `_label` property.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ objectType: string; id: string }> },
): Promise<NextResponse> {
  const { objectType, id } = await params;
  const body = await req.json().catch(() => ({}));

  const res = await fetch(`${BACKEND_URL}/api/crm/${objectType}/${id}`, {
    method: 'PATCH',
    headers: backendHeaders(req),
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[CRM PATCH] ${objectType}/${id} ${res.status}: ${text}`);
    return NextResponse.json({ error: text || res.statusText }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
