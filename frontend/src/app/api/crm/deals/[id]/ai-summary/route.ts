import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, backendHeaders } from '@/lib/apiProxy';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;

  const res = await fetch(`${BACKEND_URL}/api/crm/deals/${id}/ai-summary`, {
    method: 'POST',
    headers: backendHeaders(req),
    body: JSON.stringify({}),
  });

  if (res.status === 401) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[CRM ai-summary] POST ${id} ${res.status}: ${text}`);
    return NextResponse.json({ error: text || res.statusText }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
