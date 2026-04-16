import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isDemoRequest } from '@/lib/demoMode';
import type { Board, Offcut, InventoryResponse } from '@/types/scm';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_BOARDS: Board[] = [
  {
    id: 'board-001',
    tenantId: 'tnt_demo01',
    materialSku: 'MDF-18',
    widthMm: 2440,
    heightMm: 1220,
    thicknessMm: 18,
    status: 'AVAILABLE',
    supplierId: 'sup-maderas-norte',
    purchasedAt: '2026-04-01T00:00:00Z',
  },
  {
    id: 'board-002',
    tenantId: 'tnt_demo01',
    materialSku: 'MDF-18',
    widthMm: 2440,
    heightMm: 1220,
    thicknessMm: 18,
    status: 'AVAILABLE',
    supplierId: 'sup-maderas-norte',
    purchasedAt: '2026-04-01T00:00:00Z',
  },
  {
    id: 'board-003',
    tenantId: 'tnt_demo01',
    materialSku: 'MDF-18',
    widthMm: 1830,
    heightMm: 2440,
    thicknessMm: 18,
    status: 'RESERVED',
    reservedByWorkOrderId: 'wo-mock-pending',
    supplierId: 'sup-maderas-norte',
    purchasedAt: '2026-03-20T00:00:00Z',
  },
  {
    id: 'board-004',
    tenantId: 'tnt_demo01',
    materialSku: 'MDF-18',
    widthMm: 2440,
    heightMm: 1220,
    thicknessMm: 18,
    status: 'CONSUMED',
    supplierId: 'sup-maderas-norte',
    purchasedAt: '2026-03-10T00:00:00Z',
  },
];

const MOCK_OFFCUTS: Offcut[] = [
  {
    id: 'offcut-001',
    tenantId: 'tnt_demo01',
    materialSku: 'MDF-18',
    widthMm: 1200,
    heightMm: 1200,
    thicknessMm: 18,
    status: 'AVAILABLE',
    sourceBoardId: 'board-004',
    sourceWorkOrderId: 'wo-mock-completed',
  },
  {
    id: 'offcut-002',
    tenantId: 'tnt_demo01',
    materialSku: 'MDF-18',
    widthMm: 800,
    heightMm: 600,
    thicknessMm: 18,
    status: 'AVAILABLE',
    sourceBoardId: 'board-004',
    sourceWorkOrderId: 'wo-mock-completed',
  },
  {
    id: 'offcut-003',
    tenantId: 'tnt_demo01',
    materialSku: 'MDF-18',
    widthMm: 500,
    heightMm: 900,
    thicknessMm: 18,
    status: 'RESERVED',
    sourceBoardId: 'board-004',
    sourceWorkOrderId: 'wo-mock-completed',
    reservedByWorkOrderId: 'wo-mock-optimizing',
  },
];

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
// GET /api/scm/inventory
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const materialSku = searchParams.get('materialSku') ?? '';

  if (useMockLocal(req)) {
    let boards = MOCK_BOARDS;
    let offcuts = MOCK_OFFCUTS;

    if (materialSku) {
      boards = boards.filter((b) => b.materialSku === materialSku);
      offcuts = offcuts.filter((o) => o.materialSku === materialSku);
    }

    return NextResponse.json({ boards, offcuts } satisfies InventoryResponse);
  }

  // Proxy to NestJS backend
  try {
    await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    const qs = new URLSearchParams();
    if (materialSku) qs.set('materialSku', materialSku);
    const query = qs.toString() ? `?${qs.toString()}` : '';

    const res = await fetch(`${BACKEND_URL}/scm/inventory${query}`, {
      headers: { ...TENANT_HEADER },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Backend responded with ${res.status}`);
    }

    const data: InventoryResponse = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[SCM] inventory GET failed, falling back to mock:', (err as Error).message);
    return NextResponse.json({ boards: MOCK_BOARDS, offcuts: MOCK_OFFCUTS } satisfies InventoryResponse);
  }
}
