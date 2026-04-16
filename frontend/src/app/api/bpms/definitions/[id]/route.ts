import { NextRequest, NextResponse } from 'next/server';
import { proxyDynamicGet, proxyDynamicPost, shouldMock, BACKEND_URL, backendHeaders } from '@/lib/apiProxy';
import type { ProcessDefinition } from '@/types/bpms';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_DEFINITIONS: Record<string, ProcessDefinition> = {
  'def-pedido-muebles': {
    id: 'def-pedido-muebles', tenantId: 'tnt_demo01', name: 'Pedido de Muebles',
    description: 'Flujo completo para gestión de pedidos de muebles a medida',
    version: 2, status: 'ACTIVE', category: 'ventas', icon: 'shopping-cart',
    createdBy: 'usr_admin', nodes: [], transitions: [],
    createdAt: '2026-03-10T08:00:00Z', updatedAt: '2026-04-01T10:00:00Z',
  },
  'def-compra-material': {
    id: 'def-compra-material', tenantId: 'tnt_demo01', name: 'Compra de Material',
    description: 'Proceso de aprobación y gestión de compras de materiales',
    version: 1, status: 'ACTIVE', category: 'compras', icon: 'package',
    createdBy: 'usr_admin', nodes: [], transitions: [],
    createdAt: '2026-03-15T09:00:00Z', updatedAt: '2026-03-20T14:30:00Z',
  },
  'def-orden-trabajo': {
    id: 'def-orden-trabajo', tenantId: 'tnt_demo01', name: 'Orden de Trabajo',
    description: 'Flujo de producción y control de órdenes de trabajo en taller',
    version: 3, status: 'ACTIVE', category: 'produccion', icon: 'tool',
    createdBy: 'usr_admin', nodes: [], transitions: [],
    createdAt: '2026-02-20T07:00:00Z', updatedAt: '2026-04-10T16:00:00Z',
  },
};

function mockFallback(id: string): ProcessDefinition {
  return MOCK_DEFINITIONS[id] ?? {
    id, tenantId: 'tnt_demo01', name: 'Proceso sin título', description: '',
    version: 1, status: 'DRAFT', category: 'general', createdBy: 'usr_admin',
    nodes: [], transitions: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// GET /api/bpms/definitions/[id]
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return proxyDynamicGet(`/api/bpms/definitions/${id}`, mockFallback(id), 'BPMS', _req);
}

// ---------------------------------------------------------------------------
// PUT /api/bpms/definitions/[id]
// ---------------------------------------------------------------------------

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body = await req.json();

  if (shouldMock(req)) {
    return NextResponse.json({ ...mockFallback(id), ...body, id, updatedAt: new Date().toISOString() });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/bpms/definitions/${id}`, {
      method: 'PUT',
      headers: backendHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Backend ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error('[BPMS] definition PUT failed, mock fallback:', (err as Error).message);
    return NextResponse.json({ ...mockFallback(id), ...body, id, updatedAt: new Date().toISOString() });
  }
}
