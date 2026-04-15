import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { WorkOrder } from '@/types/scm';

// ---------------------------------------------------------------------------
// Mock data (mirrors the data defined in the list route)
// ---------------------------------------------------------------------------

const MOCK_PENDING: WorkOrder = {
  id: 'wo-mock-pending',
  tenantId: 'tnt_demo01',
  status: 'PENDING',
  requirements: [
    {
      pieceId: 'piece-001',
      materialSku: 'MDF-18',
      widthMm: 800,
      heightMm: 400,
      thicknessMm: 18,
      quantity: 3,
      label: 'Lateral izquierdo',
      allowRotation: true,
    },
    {
      pieceId: 'piece-002',
      materialSku: 'MDF-18',
      widthMm: 600,
      heightMm: 350,
      thicknessMm: 18,
      quantity: 2,
      label: 'Estante intermedio',
      allowRotation: false,
    },
  ],
  cuttingPlan: null,
  createdAt: '2026-04-15T08:00:00Z',
  updatedAt: '2026-04-15T08:00:00Z',
};

const MOCK_COMPLETED: WorkOrder = {
  id: 'wo-mock-completed',
  tenantId: 'tnt_demo01',
  status: 'COMPLETED',
  requirements: [
    {
      pieceId: 'piece-101',
      materialSku: 'MDF-18',
      widthMm: 1200,
      heightMm: 600,
      thicknessMm: 18,
      quantity: 1,
      label: 'Tapa superior',
      allowRotation: false,
    },
    {
      pieceId: 'piece-102',
      materialSku: 'MDF-18',
      widthMm: 900,
      heightMm: 400,
      thicknessMm: 18,
      quantity: 1,
      label: 'Base inferior',
      allowRotation: true,
    },
  ],
  cuttingPlan: {
    workOrderId: 'wo-mock-completed',
    boardAllocations: [
      {
        stockId: 'board-stock-001',
        stockType: 'BOARD',
        widthMm: 2440,
        heightMm: 1220,
        placements: [
          {
            pieceId: 'piece-101',
            stockId: 'board-stock-001',
            x: 10,
            y: 10,
            widthMm: 1200,
            heightMm: 600,
            rotated: false,
            label: 'Tapa superior',
          },
          {
            pieceId: 'piece-102',
            stockId: 'board-stock-001',
            x: 10,
            y: 630,
            widthMm: 900,
            heightMm: 400,
            rotated: false,
            label: 'Base inferior',
          },
        ],
        offcuts: [
          {
            x: 1230,
            y: 10,
            widthMm: 1200,
            heightMm: 1200,
            materialSku: 'MDF-18',
            thicknessMm: 18,
          },
        ],
      },
    ],
    unplacedPieceIds: [],
    totalEfficiencyPct: 87.3,
    svgLayouts: {
      'board-stock-001':
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2440 1220">' +
        '<rect width="2440" height="1220" fill="#e5e7eb" stroke="#9ca3af" stroke-width="2"/>' +
        '<rect x="10" y="10" width="1200" height="600" fill="#60a5fa" stroke="#2563eb" stroke-width="1"/>' +
        '<text x="610" y="315" text-anchor="middle" font-size="40" fill="#1e3a5f">Tapa superior</text>' +
        '<rect x="10" y="630" width="900" height="400" fill="#34d399" stroke="#059669" stroke-width="1"/>' +
        '<text x="460" y="835" text-anchor="middle" font-size="40" fill="#064e3b">Base inferior</text>' +
        '<rect x="1230" y="10" width="1200" height="1200" fill="#fde68a" stroke="#d97706" stroke-width="1" stroke-dasharray="8 4"/>' +
        '</svg>',
    },
  },
  createdAt: '2026-04-10T09:15:00Z',
  updatedAt: '2026-04-10T11:42:00Z',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BACKEND_URL = process.env.BACKEND_URL ?? '';
const TENANT_HEADER = { 'x-tenant-id': 'tnt_demo01' };

function useMock(): boolean {
  return !BACKEND_URL;
}

// ---------------------------------------------------------------------------
// GET /api/scm/work-orders/[id]
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  if (useMock()) {
    const workOrder = id === 'wo-mock-completed' ? MOCK_COMPLETED : MOCK_PENDING;
    return NextResponse.json(workOrder);
  }

  // Proxy to NestJS backend
  try {
    await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    const res = await fetch(`${BACKEND_URL}/scm/work-orders/${encodeURIComponent(id)}`, {
      headers: { ...TENANT_HEADER },
      cache: 'no-store',
    });

    if (res.status === 404) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    if (!res.ok) {
      throw new Error(`Backend responded with ${res.status}`);
    }

    const data: WorkOrder = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error(`[SCM] work-orders/${id} GET failed, falling back to mock:`, (err as Error).message);
    const workOrder = id === 'wo-mock-completed' ? MOCK_COMPLETED : MOCK_PENDING;
    return NextResponse.json(workOrder);
  }
}
