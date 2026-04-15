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
// POST /api/bpms/tasks/[id]/complete
// body: { outcome?: string; submission?: Record<string, unknown> }
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const body = await req.json();
  const outcome: string | undefined = body.outcome;

  if (useMock()) {
    return NextResponse.json({ success: true, outcome: outcome ?? null });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/bpms/tasks/${id}/complete`, {
      method: 'POST',
      headers: TENANT_HEADER,
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Backend responded with ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error('[BPMS] task complete POST failed, falling back to mock:', (err as Error).message);
    return NextResponse.json({ success: true, outcome: outcome ?? null });
  }
}
