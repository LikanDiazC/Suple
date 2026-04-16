import { NextRequest, NextResponse } from 'next/server';
import { shouldMock, BACKEND_URL, backendHeaders } from '@/lib/apiProxy';
import type { Task } from '@/types/bpms';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_TASKS: Task[] = [
  {
    id: 'task-001',
    tenantId: 'tnt_demo01',
    instanceId: 'inst-001',
    definitionId: 'def-pedido-muebles',
    nodeId: 'node-cotizacion',
    name: 'Cotizar y revisar',
    description: 'Preparar cotización detallada con materiales y tiempos de entrega',
    status: 'PENDING',
    assigneeUserId: 'usr_vendedor01',
    assigneeRole: 'vendedor',
    claimedBy: null,
    claimedAt: null,
    completedBy: null,
    completedAt: null,
    dueDate: '2026-04-17T18:00:00Z',
    outcome: null,
    form: [
      { id: 'precio_total', label: 'Precio Total', type: 'number', required: true, placeholder: '0.00' },
      { id: 'dias_entrega', label: 'Días de Entrega', type: 'number', required: true },
      { id: 'observaciones', label: 'Observaciones', type: 'textarea', required: false },
    ],
    approvalOutcomes: [],
    submission: null,
    createdAt: '2026-04-13T09:20:00Z',
    updatedAt: '2026-04-13T09:20:00Z',
    isOverdue: false,
  },
  {
    id: 'task-002',
    tenantId: 'tnt_demo01',
    instanceId: 'inst-003',
    definitionId: 'def-compra-material',
    nodeId: 'node-aprobacion',
    name: 'Aprobar solicitud',
    description: 'Revisar y aprobar o rechazar la solicitud de compra de materiales',
    status: 'IN_PROGRESS',
    assigneeUserId: null,
    assigneeRole: 'gerente',
    claimedBy: 'usr_gerente01',
    claimedAt: '2026-04-14T10:00:00Z',
    completedBy: null,
    completedAt: null,
    dueDate: '2026-04-16T23:59:00Z',
    outcome: null,
    form: [
      { id: 'comentario', label: 'Comentario', type: 'textarea', required: false },
    ],
    approvalOutcomes: ['APROBADO', 'RECHAZADO', 'SOLICITAR_INFO'],
    submission: null,
    createdAt: '2026-04-13T15:00:00Z',
    updatedAt: '2026-04-14T10:00:00Z',
    isOverdue: false,
  },
  {
    id: 'task-003',
    tenantId: 'tnt_demo01',
    instanceId: 'inst-004',
    definitionId: 'def-orden-trabajo',
    nodeId: 'node-control-calidad',
    name: 'Control de calidad',
    description: 'Verificar que la pieza terminada cumpla con las especificaciones del pedido',
    status: 'OVERDUE',
    assigneeUserId: 'usr_taller01',
    assigneeRole: 'taller',
    claimedBy: 'usr_taller01',
    claimedAt: '2026-04-10T08:00:00Z',
    completedBy: null,
    completedAt: null,
    dueDate: '2026-04-12T18:00:00Z',
    outcome: null,
    form: [
      { id: 'resultado', label: 'Resultado Inspección', type: 'select', required: true, options: ['APROBADO', 'REPROCESO', 'RECHAZO'] },
      { id: 'notas', label: 'Notas de Inspección', type: 'textarea', required: false },
    ],
    approvalOutcomes: [],
    submission: null,
    createdAt: '2026-04-10T07:00:00Z',
    updatedAt: '2026-04-10T08:00:00Z',
    isOverdue: true,
  },
];

// ---------------------------------------------------------------------------
// GET /api/bpms/tasks
// query: userId?, roles? (comma-separated), status?, page=1, limit=20
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');
  const userId = searchParams.get('userId');
  const roles = searchParams.get('roles')?.split(',').filter(Boolean) ?? [];
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);

  if (shouldMock(req)) {
    let tasks = [...MOCK_TASKS];

    if (status) {
      tasks = tasks.filter((t) => t.status === status);
    }
    if (userId) {
      tasks = tasks.filter(
        (t) => t.assigneeUserId === userId || t.claimedBy === userId
      );
    }
    if (roles.length > 0) {
      tasks = tasks.filter((t) => t.assigneeRole && roles.includes(t.assigneeRole));
    }

    const start = (page - 1) * limit;
    const paginated = tasks.slice(start, start + limit);

    return NextResponse.json({
      data: paginated,
      total: tasks.length,
      page,
      limit,
    });
  }

  try {
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await fetch(`${BACKEND_URL}/api/bpms/tasks${qs}`, {
      headers: backendHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`Backend responded with ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error('[BPMS] tasks GET failed, falling back to mock:', (err as Error).message);
    return NextResponse.json({
      data: MOCK_TASKS,
      total: MOCK_TASKS.length,
      page: 1,
      limit: 20,
    });
  }
}
