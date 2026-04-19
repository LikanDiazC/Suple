import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, backendHeaders } from '@/lib/apiProxy';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const res = await fetch(`${BACKEND_URL}/api/erp/orders/${id}/status`, {
    method: 'PATCH',
    headers: backendHeaders(req),
    body: JSON.stringify(body),
  });

  if (res.status === 401) return NextResponse.redirect(new URL('/login', req.url));
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[ERP/orders] PATCH status ${id} ${res.status}: ${text}`);
    return NextResponse.json({ error: text || res.statusText }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
