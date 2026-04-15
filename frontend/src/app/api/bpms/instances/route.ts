import { NextRequest, NextResponse } from 'next/server';
import type { ProcessInstance } from '@/types/bpms';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_INSTANCES: ProcessInstance[] = [
  {
    id: 'inst-001',
    tenantId: 'tnt_demo01',
    definitionId: 'def-pedido-muebles',
    definitionVersion: 2,
    status: 'ACTIVE',
    activeNodeIds: ['node-cotizacion'],
    completedNodeIds: ['node-start', 'node-recepcion'],
    variables: { cliente: 'Familia Rodríguez', producto: 'Mesa Comedor 8 personas' },
    startedBy: 'usr_vendedor01',
    startedAt: '2026-04-13T09:15:00Z',
    completedAt: null,
    title: 'Pedido Mesa Comedor #001',
    entityRef: { type: 'sale_order', id: 'so-001' },
  },
  {
    id: 'inst-002',
    tenantId: 'tnt_demo01',
    definitionId: 'def-compra-material',
    definitionVersion: 1,
    status: 'COMPLETED',
    activeNodeIds: [],
    completedNodeIds: ['node-start', 'node-solicitud', 'node-aprobacion', 'node-recepcion', 'node-end'],
    variables: { material: 'Tableros MDF 18mm', cantidad: 10, proveedor: 'Maderas del Norte' },
    startedBy: 'usr_compras01',
    startedAt: '2026-04-10T08:00:00Z',
    completedAt: '2026-04-12T16:30:00Z',
    title: 'Compra Tableros MDF',
    entityRef: { type: 'purchase_order', id: 'po-012' },
  },
];

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BACKEND_URL = process.env.BACKEND_URL ?? '';
const TENANT_HEADER = { 'x-tenant-id': 'tnt_demo01', 'Content-Type': 'application/json' };

function useMock(): boolean {
  return !BACKEND_URL;
}

// ---------------------------------------------------------------------------
// GET /api/bpms/instances
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (useMock()) {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status');
    const filtered = status
      ? MOCK_INSTANCES.filter((i) => i.status === status)
      : MOCK_INSTANCES;
    return NextResponse.json(filtered);
  }

  try {
    const { searchParams } = req.nextUrl;
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';

    const res = await fetch(`${BACKEND_URL}/api/bpms/instances${qs}`, {
      headers: TENANT_HEADER,
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`Backend responded with ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error('[BPMS] instances GET failed, falling back to mock:', (err as Error).message);
    return NextResponse.json(MOCK_INSTANCES);
  }
}

// ---------------------------------------------------------------------------
// POST /api/bpms/instances  (start a new process instance)
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();

  if (useMock()) {
    const mock: ProcessInstance = {
      id: `inst-mock-${Date.now()}`,
      tenantId: 'tnt_demo01',
      definitionId: body.definitionId ?? '',
      definitionVersion: body.definitionVersion ?? 1,
      status: 'ACTIVE',
      activeNodeIds: [],
      completedNodeIds: [],
      variables: body.variables ?? {},
      startedBy: body.startedBy ?? 'usr_demo',
      startedAt: new Date().toISOString(),
      completedAt: null,
      title: body.title ?? 'Nueva instancia',
      entityRef: body.entityRef ?? null,
    };
    return NextResponse.json(mock, { status: 201 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/bpms/instances`, {
      method: 'POST',
      headers: TENANT_HEADER,
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Backend responded with ${res.status}`);
    return NextResponse.json(await res.json(), { status: 201 });
  } catch (err) {
    console.error('[BPMS] instances POST failed, falling back to mock:', (err as Error).message);
    const mock: ProcessInstance = {
      id: `inst-mock-${Date.now()}`,
      tenantId: 'tnt_demo01',
      definitionId: body.definitionId ?? '',
      definitionVersion: body.definitionVersion ?? 1,
      status: 'ACTIVE',
      activeNodeIds: [],
      completedNodeIds: [],
      variables: body.variables ?? {},
      startedBy: body.startedBy ?? 'usr_demo',
      startedAt: new Date().toISOString(),
      completedAt: null,
      title: body.title ?? 'Nueva instancia',
      entityRef: body.entityRef ?? null,
    };
    return NextResponse.json(mock, { status: 201 });
  }
}
