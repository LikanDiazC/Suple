import { NextRequest, NextResponse } from 'next/server';
import { proxyDynamicGet, proxyDynamicPost, BACKEND_URL, backendHeaders } from '@/lib/apiProxy';
import { isDemoRequest } from '@/lib/demoMode';
import type { ProcessInstance } from '@/types/bpms';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_INSTANCES: Record<string, ProcessInstance> = {
  'inst-001': {
    id: 'inst-001', tenantId: 'tnt_demo01', definitionId: 'def-pedido-muebles',
    definitionVersion: 2, status: 'ACTIVE', activeNodeIds: ['node-cotizacion'],
    completedNodeIds: ['node-start', 'node-recepcion'],
    variables: { cliente: 'Familia Rodríguez', producto: 'Mesa Comedor 8 personas' },
    startedBy: 'usr_vendedor01', startedAt: '2026-04-13T09:15:00Z', completedAt: null,
    title: 'Pedido Mesa Comedor #001', entityRef: { type: 'sale_order', id: 'so-001' },
  },
  'inst-002': {
    id: 'inst-002', tenantId: 'tnt_demo01', definitionId: 'def-compra-material',
    definitionVersion: 1, status: 'COMPLETED', activeNodeIds: [],
    completedNodeIds: ['node-start', 'node-solicitud', 'node-aprobacion', 'node-recepcion', 'node-end'],
    variables: { material: 'Tableros MDF 18mm', cantidad: 10, proveedor: 'Maderas del Norte' },
    startedBy: 'usr_compras01', startedAt: '2026-04-10T08:00:00Z', completedAt: '2026-04-12T16:30:00Z',
    title: 'Compra Tableros MDF', entityRef: { type: 'purchase_order', id: 'po-012' },
  },
};

function mockFallback(id: string): ProcessInstance {
  return MOCK_INSTANCES[id] ?? {
    id, tenantId: 'tnt_demo01', definitionId: 'def-unknown', definitionVersion: 1,
    status: 'ACTIVE', activeNodeIds: [], completedNodeIds: [], variables: {},
    startedBy: 'usr_demo', startedAt: new Date().toISOString(), completedAt: null,
    title: 'Instancia desconocida', entityRef: null,
  };
}

// ---------------------------------------------------------------------------
// GET /api/bpms/instances/[id]
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return proxyDynamicGet(`/api/bpms/instances/${id}`, mockFallback(id), 'BPMS', _req);
}

// ---------------------------------------------------------------------------
// POST /api/bpms/instances/[id] — fallback passthrough
// ---------------------------------------------------------------------------

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  if (BACKEND_URL && !isDemoRequest(_req)) {
    try {
      const url = new URL(_req.url);
      const res = await fetch(`${BACKEND_URL}${url.pathname}`, {
        method: 'POST',
        headers: backendHeaders(),
      });
      if (!res.ok) throw new Error(`Backend ${res.status}`);
      return NextResponse.json(await res.json());
    } catch { /* fall through to mock */ }
  }
  const instance = mockFallback(id);
  return NextResponse.json({ ...instance, status: 'CANCELLED', completedAt: new Date().toISOString() });
}
