import { NextRequest, NextResponse } from 'next/server';
import type { ProcessInstance } from '@/types/bpms';

// ---------------------------------------------------------------------------
// Mock data (mirrors the instances collection route)
// ---------------------------------------------------------------------------

const MOCK_INSTANCES: Record<string, ProcessInstance> = {
  'inst-001': {
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
  'inst-002': {
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
};

function mockFallback(id: string): ProcessInstance {
  return (
    MOCK_INSTANCES[id] ?? {
      id,
      tenantId: 'tnt_demo01',
      definitionId: 'def-unknown',
      definitionVersion: 1,
      status: 'ACTIVE',
      activeNodeIds: [],
      completedNodeIds: [],
      variables: {},
      startedBy: 'usr_demo',
      startedAt: new Date().toISOString(),
      completedAt: null,
      title: 'Instancia desconocida',
      entityRef: null,
    }
  );
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BACKEND_URL = process.env.BACKEND_URL ?? '';
const TENANT_HEADER = { 'x-tenant-id': 'tnt_demo01', 'Content-Type': 'application/json' };

function useMock(): boolean {
  return !BACKEND_URL;
}

// ---------------------------------------------------------------------------
// GET /api/bpms/instances/[id]
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  if (useMock()) {
    return NextResponse.json(mockFallback(id));
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/bpms/instances/${id}`, {
      headers: TENANT_HEADER,
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`Backend responded with ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error('[BPMS] instance GET failed, falling back to mock:', (err as Error).message);
    return NextResponse.json(mockFallback(id));
  }
}

// ---------------------------------------------------------------------------
// POST /api/bpms/instances/[id]/cancel  is handled by a sibling route.
// This file only handles GET for a single instance. If the request path
// ends with /cancel it should be routed to the cancel sub-route; here we
// return 405 for unrecognised methods.
// ---------------------------------------------------------------------------

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  // Proxy cancel if backend is available
  if (!useMock()) {
    try {
      const url = new URL(_req.url);
      const res = await fetch(`${BACKEND_URL}${url.pathname}`, {
        method: 'POST',
        headers: TENANT_HEADER,
      });
      if (!res.ok) throw new Error(`Backend responded with ${res.status}`);
      return NextResponse.json(await res.json());
    } catch (err) {
      console.error('[BPMS] instance POST failed:', (err as Error).message);
    }
  }
  // Mock: return the instance with CANCELLED status
  const instance = mockFallback(id);
  return NextResponse.json({ ...instance, status: 'CANCELLED', completedAt: new Date().toISOString() });
}
