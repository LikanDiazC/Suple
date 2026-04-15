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
// POST /api/bpms/definitions/[id]/publish
// ---------------------------------------------------------------------------

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  if (useMock()) {
    return NextResponse.json({ success: true });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/bpms/definitions/${id}/publish`, {
      method: 'POST',
      headers: TENANT_HEADER,
    });

    if (!res.ok) throw new Error(`Backend responded with ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error('[BPMS] publish POST failed, falling back to mock:', (err as Error).message);
    return NextResponse.json({ success: true });
  }
}
