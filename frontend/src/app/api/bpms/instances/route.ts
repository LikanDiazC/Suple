import { proxyGet, proxyPost } from '@/lib/apiProxy';
import type { ProcessInstance } from '@/types/bpms';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_INSTANCES: ProcessInstance[] = [
  {
    id: 'inst-001', tenantId: 'tnt_demo01', definitionId: 'def-pedido-muebles',
    definitionVersion: 2, status: 'ACTIVE', activeNodeIds: ['node-cotizacion'],
    completedNodeIds: ['node-start', 'node-recepcion'],
    variables: { cliente: 'Familia Rodríguez', producto: 'Mesa Comedor 8 personas' },
    startedBy: 'usr_vendedor01', startedAt: '2026-04-13T09:15:00Z', completedAt: null,
    title: 'Pedido Mesa Comedor #001', entityRef: { type: 'sale_order', id: 'so-001' },
  },
  {
    id: 'inst-002', tenantId: 'tnt_demo01', definitionId: 'def-compra-material',
    definitionVersion: 1, status: 'COMPLETED', activeNodeIds: [],
    completedNodeIds: ['node-start', 'node-solicitud', 'node-aprobacion', 'node-recepcion', 'node-end'],
    variables: { material: 'Tableros MDF 18mm', cantidad: 10, proveedor: 'Maderas del Norte' },
    startedBy: 'usr_compras01', startedAt: '2026-04-10T08:00:00Z', completedAt: '2026-04-12T16:30:00Z',
    title: 'Compra Tableros MDF', entityRef: { type: 'purchase_order', id: 'po-012' },
  },
];

const MOCK_POST: ProcessInstance = {
  id: `inst-mock-${Date.now()}`, tenantId: 'tnt_demo01', definitionId: '',
  definitionVersion: 1, status: 'ACTIVE', activeNodeIds: [], completedNodeIds: [],
  variables: {}, startedBy: 'usr_demo', startedAt: new Date().toISOString(),
  completedAt: null, title: 'Nueva instancia', entityRef: null,
};

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const GET  = proxyGet('/api/bpms/instances', MOCK_INSTANCES, { tag: 'BPMS' });
export const POST = proxyPost('/api/bpms/instances', MOCK_POST, { mockStatus: 201, successStatus: 201, tag: 'BPMS' });
