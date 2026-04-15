import { proxyGet, proxyPost } from '@/lib/apiProxy';
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

const MOCK_POST: ProcessDefinition = {
  id: `mock-${Date.now()}`,
  tenantId: 'tnt_demo01',
  name: '',
  description: '',
  version: 1,
  status: 'DRAFT',
  category: '',
  createdBy: 'anonymous',
  nodes: [],
  transitions: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const GET  = proxyGet('/api/bpms/definitions', MOCK_DEFINITIONS, { tag: 'BPMS' });
export const POST = proxyPost('/api/bpms/definitions', MOCK_POST, { mockStatus: 201, successStatus: 201, tag: 'BPMS' });
