import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BACKEND_URL = process.env.BACKEND_URL ?? '';
const TENANT_HEADER = { 'x-tenant-id': 'tnt_demo01', 'Content-Type': 'application/json' };

function useMock(): boolean {
  return !BACKEND_URL;
}

// ---------------------------------------------------------------------------
// POST /api/bpms/instances/[id]/cancel
// body: { reason?: string; cancelledBy?: string }
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const body = await req.json();

  if (useMock()) {
    return NextResponse.json({ success: true, instanceId: id });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/bpms/instances/${id}/cancel`, {
      method: 'POST',
      headers: TENANT_HEADER,
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Backend responded with ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error('[BPMS] instance cancel POST failed, falling back to mock:', (err as Error).message);
    return NextResponse.json({ success: true, instanceId: id });
  }
}
