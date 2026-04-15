import { NextRequest, NextResponse } from 'next/server';
import type { ProcessDefinition } from '@/types/bpms';

// ---------------------------------------------------------------------------
// Mock data (seeded templates)
// ---------------------------------------------------------------------------

const MOCK_DEFINITIONS: ProcessDefinition[] = [
  {
    id: 'def-pedido-muebles',
    tenantId: 'tnt_demo01',
    name: 'Pedido de Muebles',
    description: 'Flujo completo para gestión de pedidos de muebles a medida',
    version: 2,
    status: 'ACTIVE',
    category: 'ventas',
    icon: 'shopping-cart',
    createdBy: 'usr_admin',
    nodes: [],
    transitions: [],
    createdAt: '2026-03-10T08:00:00Z',
    updatedAt: '2026-04-01T10:00:00Z',
  },
  {
    id: 'def-compra-material',
    tenantId: 'tnt_demo01',
    name: 'Compra de Material',
    description: 'Proceso de aprobación y gestión de compras de materiales',
    version: 1,
    status: 'ACTIVE',
    category: 'compras',
    icon: 'package',
    createdBy: 'usr_admin',
    nodes: [],
    transitions: [],
    createdAt: '2026-03-15T09:00:00Z',
    updatedAt: '2026-03-20T14:30:00Z',
  },
  {
    id: 'def-orden-trabajo',
    tenantId: 'tnt_demo01',
    name: 'Orden de Trabajo',
    description: 'Flujo de producción y control de órdenes de trabajo en taller',
    version: 3,
    status: 'ACTIVE',
    category: 'produccion',
    icon: 'tool',
    createdBy: 'usr_admin',
    nodes: [],
    transitions: [],
    createdAt: '2026-02-20T07:00:00Z',
    updatedAt: '2026-04-10T16:00:00Z',
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
// GET /api/bpms/definitions
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (useMock()) {
    return NextResponse.json(MOCK_DEFINITIONS);
  }

  try {
    const { searchParams } = req.nextUrl;
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';

    const res = await fetch(`${BACKEND_URL}/api/bpms/definitions${qs}`, {
      headers: TENANT_HEADER,
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`Backend responded with ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error('[BPMS] definitions GET failed, falling back to mock:', (err as Error).message);
    return NextResponse.json(MOCK_DEFINITIONS);
  }
}

// ---------------------------------------------------------------------------
// POST /api/bpms/definitions
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();

  if (useMock()) {
    const mock: ProcessDefinition = {
      id: `mock-${Date.now()}`,
      ...body,
      status: 'DRAFT',
      version: 1,
      nodes: [],
      transitions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json(mock, { status: 201 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/bpms/definitions`, {
      method: 'POST',
      headers: TENANT_HEADER,
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Backend responded with ${res.status}`);
    return NextResponse.json(await res.json(), { status: 201 });
  } catch (err) {
    console.error('[BPMS] definitions POST failed, falling back to mock:', (err as Error).message);
    const mock: ProcessDefinition = {
      id: `mock-${Date.now()}`,
      ...body,
      status: 'DRAFT',
      version: 1,
      nodes: [],
      transitions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json(mock, { status: 201 });
  }
}
