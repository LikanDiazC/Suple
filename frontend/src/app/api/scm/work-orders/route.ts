import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { WorkOrder, WorkOrderListResponse, CuttingRequirement } from '@/types/scm';

// ---------------------------------------------------------------------------
// Mock data
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
  ] satisfies CuttingRequirement[],
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
  ] satisfies CuttingRequirement[],
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

const MOCK_OPTIMIZING: WorkOrder = {
  id: 'wo-mock-optimizing',
  tenantId: 'tnt_demo01',
  status: 'OPTIMIZING',
  requirements: [
    {
      pieceId: 'piece-201',
      materialSku: 'MDF-18',
      widthMm: 500,
      heightMm: 300,
      thicknessMm: 18,
      quantity: 6,
      label: 'Repisa corta',
      allowRotation: true,
    },
    {
      pieceId: 'piece-202',
      materialSku: 'MDF-18',
      widthMm: 700,
      heightMm: 250,
      thicknessMm: 18,
      quantity: 4,
      label: 'Repisa larga',
      allowRotation: true,
    },
  ] satisfies CuttingRequirement[],
  cuttingPlan: null,
  createdAt: '2026-04-15T10:30:00Z',
  updatedAt: '2026-04-15T10:35:00Z',
};

const MOCK_WORK_ORDERS: WorkOrder[] = [MOCK_PENDING, MOCK_COMPLETED, MOCK_OPTIMIZING];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BACKEND_URL = process.env.BACKEND_URL ?? '';
const TENANT_HEADER = { 'x-tenant-id': 'tnt_demo01' };

function useMock(): boolean {
  return !BACKEND_URL;
}

// ---------------------------------------------------------------------------
// GET /api/scm/work-orders
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') ?? '20', 10)));
  const status = searchParams.get('status') ?? '';

  if (useMock()) {
    let items = MOCK_WORK_ORDERS;
    if (status) {
      items = items.filter((wo) => wo.status === status);
    }
    const total = items.length;
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);
    return NextResponse.json({ items: paged, total, page, limit } satisfies WorkOrderListResponse);
  }

  // Proxy to NestJS backend
  try {
    await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) qs.set('status', status);

    const res = await fetch(`${BACKEND_URL}/scm/work-orders?${qs.toString()}`, {
      headers: { ...TENANT_HEADER, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Backend responded with ${res.status}`);
    }

    const data: WorkOrderListResponse = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[SCM] work-orders GET failed, falling back to mock:', (err as Error).message);
    const total = MOCK_WORK_ORDERS.length;
    const start = (page - 1) * limit;
    const paged = MOCK_WORK_ORDERS.slice(start, start + limit);
    return NextResponse.json({ items: paged, total, page, limit } satisfies WorkOrderListResponse);
  }
}

// ---------------------------------------------------------------------------
// POST /api/scm/work-orders
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { requirements: CuttingRequirement[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(body.requirements) || body.requirements.length === 0) {
    return NextResponse.json({ error: 'requirements must be a non-empty array' }, { status: 422 });
  }

  if (useMock()) {
    const newOrder: WorkOrder = {
      id: `wo-mock-${Date.now()}`,
      tenantId: 'tnt_demo01',
      status: 'PENDING',
      requirements: body.requirements,
      cuttingPlan: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json(newOrder, { status: 201 });
  }

  // Proxy to NestJS backend
  try {
    await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    const res = await fetch(`${BACKEND_URL}/scm/work-orders`, {
      method: 'POST',
      headers: { ...TENANT_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: errorText }, { status: res.status });
    }

    const created: WorkOrder = await res.json();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('[SCM] work-orders POST failed:', (err as Error).message);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
