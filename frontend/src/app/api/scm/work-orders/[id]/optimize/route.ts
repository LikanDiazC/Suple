import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isDemoRequest } from '@/lib/demoMode';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BACKEND_URL = process.env.BACKEND_URL ?? '';
const TENANT_HEADER = { 'x-tenant-id': 'tnt_demo01' };

function useMockLocal(req?: NextRequest): boolean {
  if (!BACKEND_URL) return true;
  if (req && isDemoRequest(req)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// POST /api/scm/work-orders/[id]/optimize
//
// Proxies to NestJS POST /api/scm/work-orders/{id}/optimize.
// In mock mode returns { status: 'OPTIMIZING' } immediately.
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  // Mock mode — return OPTIMIZING immediately so the UI can react
  if (useMockLocal(req)) {
    return NextResponse.json({ status: 'OPTIMIZING' });
  }

  // Proxy to NestJS backend
  try {
    await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    const res = await fetch(
      `${BACKEND_URL}/scm/work-orders/${encodeURIComponent(id)}/optimize`,
      {
        method: 'POST',
        headers: {
          ...TENANT_HEADER,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[SCM] work-orders/${id}/optimize POST failed (${res.status}):`, body);
      // Fall back to mock response so the frontend can still poll for updates
      return NextResponse.json({ status: 'OPTIMIZING' });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error(
      `[SCM] work-orders/${id}/optimize POST error, falling back to mock:`,
      (err as Error).message,
    );
    return NextResponse.json({ status: 'OPTIMIZING' });
  }
}
