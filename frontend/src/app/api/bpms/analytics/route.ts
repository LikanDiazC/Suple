import { NextRequest, NextResponse } from 'next/server';
import type { BpmsAnalytics } from '@/types/bpms';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_ANALYTICS: BpmsAnalytics = {
  activeInstances: 5,
  pendingTasks: 12,
  overdueTasks: 2,
  completedToday: 3,
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BACKEND_URL = process.env.BACKEND_URL ?? '';
const TENANT_HEADER = { 'x-tenant-id': 'tnt_demo01', 'Content-Type': 'application/json' };

function useMock(): boolean {
  return !BACKEND_URL;
}

// ---------------------------------------------------------------------------
// GET /api/bpms/analytics
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest): Promise<NextResponse> {
  if (useMock()) {
    return NextResponse.json(MOCK_ANALYTICS);
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/bpms/analytics`, {
      headers: TENANT_HEADER,
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`Backend responded with ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error('[BPMS] analytics GET failed, falling back to mock:', (err as Error).message);
    return NextResponse.json(MOCK_ANALYTICS);
  }
}
