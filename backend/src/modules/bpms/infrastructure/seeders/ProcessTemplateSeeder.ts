import { Injectable, Inject } from '@nestjs/common';
import { ProcessDefinition } from '../../domain/entities/ProcessDefinition';
import { IProcessDefinitionRepository } from '../../domain/repositories/IProcessDefinitionRepository';
import { PROCESS_DEFINITION_REPOSITORY } from '../../domain/repositories/IProcessDefinitionRepository';
import { FlowNode } from '../../domain/value-objects/FlowNode';
import { Transition, TransitionConditionOperator } from '../../domain/value-objects/Transition';
import { NodeType } from '../../domain/services/DAGExecutionEngine';

const SYSTEM_TENANT = '_system_';

const TPL_IDS = {
  pedidoMuebles:  'bpms-tpl-pedido-muebles',
  compraMaterial: 'bpms-tpl-compra-material',
  ordenTrabajo:   'bpms-tpl-orden-trabajo',
} as const;

@Injectable()
export class ProcessTemplateSeeder {
  constructor(
    @Inject(PROCESS_DEFINITION_REPOSITORY)
    private readonly repo: IProcessDefinitionRepository,
  ) {}

  async seed(tenantId: string = SYSTEM_TENANT): Promise<void> {
    await this.seedPedidoMuebles(tenantId);
    await this.seedComprasMaterial(tenantId);
    await this.seedOrdenTrabajo(tenantId);
  }

  // ---------------------------------------------------------------------------
  // Template 1: Pedido de Muebles
  // ---------------------------------------------------------------------------

  private async seedPedidoMuebles(tenantId: string): Promise<void> {
    const existing = await this.repo.findByIdAnyTenant(TPL_IDS.pedidoMuebles);
    if (existing) return;

    const result = ProcessDefinition.create(tenantId, {
      name:        'Pedido de Muebles',
      description: 'Proceso completo para gestionar un pedido de muebles desde la cotización hasta la facturación.',
      category:    'ventas',
      createdBy:   'system',
      icon:        '🛋️',
    });
    if (result.isFail()) throw new Error(`[ProcessTemplateSeeder] ${result.error}`);

    const def = result.value;

    // Override auto-generated id with the well-known template id so idempotency works.
    // We reconstitute with fixed id, copying the current props.
    const fixed = ProcessDefinition.reconstitute(
      TPL_IDS.pedidoMuebles,
      tenantId,
      {
        name:        def.name,
        description: def.description,
        version:     def.version,
        status:      def.status,
        nodes:       [...def.nodes],
        transitions: [...def.transitions],
        category:    def.category,
        icon:        def.icon,
        createdBy:   def.createdBy,
        createdAt:   def.createdAt,
        updatedAt:   def.updatedAt,
      },
    );

    // ── Nodes ────────────────────────────────────────────────────────────────

    fixed.addNode(FlowNode.create('n1',  NodeType.START_EVENT,        'Pedido recibido',          { x: 100,  y: 200 }, { type: NodeType.START_EVENT }));
    fixed.addNode(FlowNode.create('n2',  NodeType.USER_TASK,           'Cotizar y revisar',         { x: 300,  y: 200 }, { type: NodeType.USER_TASK,  assigneeRole: 'vendedor',         slaHours: 8,  form: [{ id: 'cotizacion', label: 'Monto cotización', type: 'number',   required: true }, { id: 'notas', label: 'Notas', type: 'textarea', required: false }], approvalOutcomes: ['LISTO'] }));
    fixed.addNode(FlowNode.create('n3',  NodeType.USER_TASK,           'Aprobación de cliente',     { x: 500,  y: 200 }, { type: NodeType.USER_TASK,  assigneeRole: 'cliente',          slaHours: 72, form: [{ id: 'comentario', label: 'Comentario',       type: 'textarea', required: false }],                                                                                         approvalOutcomes: ['APROBADO', 'RECHAZADO'] }));
    fixed.addNode(FlowNode.create('n4',  NodeType.EXCLUSIVE_GATEWAY,   '¿Aprobado?',               { x: 700,  y: 200 }, { type: NodeType.EXCLUSIVE_GATEWAY }));
    fixed.addNode(FlowNode.create('n5',  NodeType.USER_TASK,           'Revisar cotización',        { x: 700,  y: 350 }, { type: NodeType.USER_TASK,  assigneeRole: 'vendedor',         slaHours: 4,                                                                                                                                                                                     approvalOutcomes: ['LISTO'] }));
    fixed.addNode(FlowNode.create('n6',  NodeType.USER_TASK,           'Validar capacidad prod.',   { x: 900,  y: 200 }, { type: NodeType.USER_TASK,  assigneeRole: 'jefe_produccion',  slaHours: 8,                                                                                                                                                                                     approvalOutcomes: ['CONFIRMADO'] }));
    fixed.addNode(FlowNode.create('n7',  NodeType.USER_TASK,           'Verificar crédito cliente', { x: 900,  y: 350 }, { type: NodeType.USER_TASK,  assigneeRole: 'finanzas',         slaHours: 4,                                                                                                                                                                                     approvalOutcomes: ['APROBADO', 'RECHAZADO'] }));
    fixed.addNode(FlowNode.create('n8',  NodeType.SERVICE_TASK,        'Optimizar corte (SCM)',     { x: 1100, y: 200 }, { type: NodeType.SERVICE_TASK, serviceType: 'SCM_OPTIMIZE' }));
    fixed.addNode(FlowNode.create('n9',  NodeType.USER_TASK,           'Ejecutar producción',       { x: 1300, y: 200 }, { type: NodeType.USER_TASK,  assigneeRole: 'operario',         slaHours: 48,                                                                                                                                                                                    approvalOutcomes: ['COMPLETADO'] }));
    fixed.addNode(FlowNode.create('n10', NodeType.USER_TASK,           'Control de calidad',        { x: 1500, y: 200 }, { type: NodeType.USER_TASK,  assigneeRole: 'control_calidad',  slaHours: 8,                                                                                                                                                                                     approvalOutcomes: ['APROBADO', 'RECHAZADO'] }));
    fixed.addNode(FlowNode.create('n11', NodeType.EXCLUSIVE_GATEWAY,   '¿QC OK?',                  { x: 1700, y: 200 }, { type: NodeType.EXCLUSIVE_GATEWAY }));
    fixed.addNode(FlowNode.create('n12', NodeType.USER_TASK,           'Despachar pedido',          { x: 1900, y: 200 }, { type: NodeType.USER_TASK,  assigneeRole: 'logistica',        slaHours: 4,                                                                                                                                                                                     approvalOutcomes: ['DESPACHADO'] }));
    fixed.addNode(FlowNode.create('n13', NodeType.USER_TASK,           'Facturar',                  { x: 2100, y: 200 }, { type: NodeType.USER_TASK,  assigneeRole: 'finanzas',         slaHours: 24,                                                                                                                                                                                    approvalOutcomes: ['FACTURADO'] }));
    fixed.addNode(FlowNode.create('n14', NodeType.END_EVENT,           'Pedido completado',         { x: 2300, y: 200 }, { type: NodeType.END_EVENT }));

    // ── Transitions ──────────────────────────────────────────────────────────

    fixed.addTransition(Transition.create('n1',  'n2',  []));
    fixed.addTransition(Transition.create('n2',  'n3',  []));
    fixed.addTransition(Transition.create('n3',  'n4',  []));
    fixed.addTransition(Transition.create('n4',  'n6',  [{ field: 'outcome', operator: TransitionConditionOperator.EQUALS, value: 'APROBADO' }], 0, false));
    fixed.addTransition(Transition.create('n4',  'n5',  [], 1, true));
    fixed.addTransition(Transition.create('n5',  'n3',  []));  // loop back
    fixed.addTransition(Transition.create('n6',  'n7',  []));  // was n6→n8 — n7 was orphaned
    fixed.addTransition(Transition.create('n7',  'n8',  []));
    fixed.addTransition(Transition.create('n8',  'n9',  []));
    fixed.addTransition(Transition.create('n9',  'n10', []));
    fixed.addTransition(Transition.create('n10', 'n11', []));
    fixed.addTransition(Transition.create('n11', 'n12', [{ field: 'outcome', operator: TransitionConditionOperator.EQUALS, value: 'APROBADO' }], 0, false));
    fixed.addTransition(Transition.create('n11', 'n9',  [], 1, true));  // reprocesar loop
    fixed.addTransition(Transition.create('n12', 'n13', []));
    fixed.addTransition(Transition.create('n13', 'n14', []));

    const publishResult = fixed.publish();
    if (publishResult.isFail()) {
      throw new Error(
        `[ProcessTemplateSeeder] Failed to publish "Pedido de Muebles": ${publishResult.error}`,
      );
    }

    await this.repo.save(fixed);
  }

  // ---------------------------------------------------------------------------
  // Template 2: Compra de Material
  // ---------------------------------------------------------------------------

  private async seedComprasMaterial(tenantId: string): Promise<void> {
    const existing = await this.repo.findByIdAnyTenant(TPL_IDS.compraMaterial);
    if (existing) return;

    const result = ProcessDefinition.create(tenantId, {
      name:        'Compra de Material',
      description: 'Proceso para solicitar, aprobar y gestionar la compra de materiales.',
      category:    'compras',
      createdBy:   'system',
      icon:        '📦',
    });
    if (result.isFail()) throw new Error(`[ProcessTemplateSeeder] ${result.error}`);

    const def = result.value;

    const fixed = ProcessDefinition.reconstitute(
      TPL_IDS.compraMaterial,
      tenantId,
      {
        name:        def.name,
        description: def.description,
        version:     def.version,
        status:      def.status,
        nodes:       [...def.nodes],
        transitions: [...def.transitions],
        category:    def.category,
        icon:        def.icon,
        createdBy:   def.createdBy,
        createdAt:   def.createdAt,
        updatedAt:   def.updatedAt,
      },
    );

    // ── Nodes ────────────────────────────────────────────────────────────────

    fixed.addNode(FlowNode.create('n1',  NodeType.START_EVENT,       'Solicitud iniciada',         { x: 100,  y: 200 }, { type: NodeType.START_EVENT }));
    fixed.addNode(FlowNode.create('n2',  NodeType.USER_TASK,          'Completar solicitud',         { x: 300,  y: 200 }, { type: NodeType.USER_TASK, assigneeRole: 'solicitante',  slaHours: 2,  form: [{ id: 'descripcion', label: 'Descripción del material', type: 'textarea', required: true }, { id: 'cantidad', label: 'Cantidad', type: 'number', required: true }, { id: 'urgente', label: 'Urgente', type: 'checkbox', required: false }], approvalOutcomes: ['ENVIADA'] }));
    fixed.addNode(FlowNode.create('n3',  NodeType.USER_TASK,          'Aprobar solicitud',           { x: 500,  y: 200 }, { type: NodeType.USER_TASK, assigneeRole: 'jefe_bodega',  slaHours: 4,                                                                                                                                                                                                                                                                                              approvalOutcomes: ['APROBADO', 'RECHAZADO'] }));
    fixed.addNode(FlowNode.create('n4',  NodeType.EXCLUSIVE_GATEWAY,  '¿Aprobado?',                 { x: 700,  y: 200 }, { type: NodeType.EXCLUSIVE_GATEWAY }));
    fixed.addNode(FlowNode.create('n5',  NodeType.END_EVENT,          'Solicitud rechazada',         { x: 700,  y: 350 }, { type: NodeType.END_EVENT }));
    fixed.addNode(FlowNode.create('n6',  NodeType.USER_TASK,          'Seleccionar proveedor y OC',  { x: 900,  y: 200 }, { type: NodeType.USER_TASK, assigneeRole: 'jefe_compras', slaHours: 8,  form: [{ id: 'proveedor', label: 'Proveedor', type: 'text', required: true }, { id: 'monto', label: 'Monto OC', type: 'number', required: true }],                                                                                                                                          approvalOutcomes: ['OC_EMITIDA'] }));
    fixed.addNode(FlowNode.create('n7',  NodeType.USER_TASK,          'Recibir y verificar',         { x: 1100, y: 200 }, { type: NodeType.USER_TASK, assigneeRole: 'bodeguero',    slaHours: 72, form: [{ id: 'recibido_completo', label: '¿Recibido completo?', type: 'checkbox', required: true }],                                                                                                                                                                                   approvalOutcomes: ['COMPLETO', 'PARCIAL'] }));
    fixed.addNode(FlowNode.create('n8',  NodeType.EXCLUSIVE_GATEWAY,  '¿Recibido completo?',         { x: 1300, y: 200 }, { type: NodeType.EXCLUSIVE_GATEWAY }));
    fixed.addNode(FlowNode.create('n9',  NodeType.USER_TASK,          'Gestionar diferencia',        { x: 1300, y: 350 }, { type: NodeType.USER_TASK, assigneeRole: 'jefe_compras', slaHours: 8,                                                                                                                                                                                                                                                                                              approvalOutcomes: ['RESUELTO'] }));
    fixed.addNode(FlowNode.create('n10', NodeType.USER_TASK,          'Aprobar pago',                { x: 1500, y: 200 }, { type: NodeType.USER_TASK, assigneeRole: 'finanzas',     slaHours: 24,                                                                                                                                                                                                                                                                                             approvalOutcomes: ['PAGADO'] }));
    fixed.addNode(FlowNode.create('n11', NodeType.END_EVENT,          'Compra completada',           { x: 1700, y: 200 }, { type: NodeType.END_EVENT }));

    // ── Transitions ──────────────────────────────────────────────────────────

    fixed.addTransition(Transition.create('n1',  'n2',  []));
    fixed.addTransition(Transition.create('n2',  'n3',  []));
    fixed.addTransition(Transition.create('n3',  'n4',  []));
    fixed.addTransition(Transition.create('n4',  'n6',  [{ field: 'outcome', operator: TransitionConditionOperator.EQUALS, value: 'APROBADO' }], 0, false));
    fixed.addTransition(Transition.create('n4',  'n5',  [], 1, true));
    fixed.addTransition(Transition.create('n6',  'n7',  []));
    fixed.addTransition(Transition.create('n7',  'n8',  []));
    fixed.addTransition(Transition.create('n8',  'n10', [{ field: 'outcome', operator: TransitionConditionOperator.EQUALS, value: 'COMPLETO' }], 0, false));
    fixed.addTransition(Transition.create('n8',  'n9',  [], 1, true));
    fixed.addTransition(Transition.create('n9',  'n7',  []));  // loop back
    fixed.addTransition(Transition.create('n10', 'n11', []));

    const publishResult = fixed.publish();
    if (publishResult.isFail()) {
      throw new Error(
        `[ProcessTemplateSeeder] Failed to publish "Compra de Material": ${publishResult.error}`,
      );
    }

    await this.repo.save(fixed);
  }

  // ---------------------------------------------------------------------------
  // Template 3: Orden de Trabajo
  // ---------------------------------------------------------------------------

  private async seedOrdenTrabajo(tenantId: string): Promise<void> {
    const existing = await this.repo.findByIdAnyTenant(TPL_IDS.ordenTrabajo);
    if (existing) return;

    const result = ProcessDefinition.create(tenantId, {
      name:        'Orden de Trabajo',
      description: 'Proceso para ejecutar una orden de trabajo de corte y ensamble con control de calidad.',
      category:    'produccion',
      createdBy:   'system',
      icon:        '⚙️',
    });
    if (result.isFail()) throw new Error(`[ProcessTemplateSeeder] ${result.error}`);

    const def = result.value;

    const fixed = ProcessDefinition.reconstitute(
      TPL_IDS.ordenTrabajo,
      tenantId,
      {
        name:        def.name,
        description: def.description,
        version:     def.version,
        status:      def.status,
        nodes:       [...def.nodes],
        transitions: [...def.transitions],
        category:    def.category,
        icon:        def.icon,
        createdBy:   def.createdBy,
        createdAt:   def.createdAt,
        updatedAt:   def.updatedAt,
      },
    );

    // ── Nodes ────────────────────────────────────────────────────────────────

    fixed.addNode(FlowNode.create('n1', NodeType.START_EVENT,       'OT recibida',                { x: 100,  y: 200 }, { type: NodeType.START_EVENT }));
    fixed.addNode(FlowNode.create('n2', NodeType.USER_TASK,          'Revisar y asignar operario', { x: 300,  y: 200 }, { type: NodeType.USER_TASK, assigneeRole: 'jefe_produccion', slaHours: 2,  form: [{ id: 'operario', label: 'Operario asignado', type: 'text', required: true }], approvalOutcomes: ['ASIGNADO'] }));
    fixed.addNode(FlowNode.create('n3', NodeType.SERVICE_TASK,       'Ejecutar optimización SCM',  { x: 500,  y: 200 }, { type: NodeType.SERVICE_TASK, serviceType: 'SCM_OPTIMIZE' }));
    fixed.addNode(FlowNode.create('n4', NodeType.USER_TASK,          'Confirmar inicio de corte',  { x: 700,  y: 200 }, { type: NodeType.USER_TASK, assigneeRole: 'operario',        slaHours: 1,                                                                                                 approvalOutcomes: ['INICIADO'] }));
    fixed.addNode(FlowNode.create('n5', NodeType.USER_TASK,          'Completar corte',            { x: 900,  y: 200 }, { type: NodeType.USER_TASK, assigneeRole: 'operario',        slaHours: 24, form: [{ id: 'observaciones', label: 'Observaciones', type: 'textarea', required: false }],    approvalOutcomes: ['COMPLETADO'] }));
    fixed.addNode(FlowNode.create('n6', NodeType.USER_TASK,          'Inspección de calidad',      { x: 1100, y: 200 }, { type: NodeType.USER_TASK, assigneeRole: 'control_calidad', slaHours: 4,                                                                                                 approvalOutcomes: ['APROBADO', 'RECHAZADO'] }));
    fixed.addNode(FlowNode.create('n7', NodeType.EXCLUSIVE_GATEWAY,  '¿QC OK?',                   { x: 1300, y: 200 }, { type: NodeType.EXCLUSIVE_GATEWAY }));
    fixed.addNode(FlowNode.create('n8', NodeType.USER_TASK,          'Reprocesar',                 { x: 1300, y: 350 }, { type: NodeType.USER_TASK, assigneeRole: 'operario',        slaHours: 8,                                                                                                 approvalOutcomes: ['COMPLETADO'] }));
    fixed.addNode(FlowNode.create('n9', NodeType.END_EVENT,          'OT completada',              { x: 1500, y: 200 }, { type: NodeType.END_EVENT }));

    // ── Transitions ──────────────────────────────────────────────────────────

    fixed.addTransition(Transition.create('n1', 'n2', []));
    fixed.addTransition(Transition.create('n2', 'n3', []));
    fixed.addTransition(Transition.create('n3', 'n4', []));
    fixed.addTransition(Transition.create('n4', 'n5', []));
    fixed.addTransition(Transition.create('n5', 'n6', []));
    fixed.addTransition(Transition.create('n6', 'n7', []));
    fixed.addTransition(Transition.create('n7', 'n9', [{ field: 'outcome', operator: TransitionConditionOperator.EQUALS, value: 'APROBADO' }], 0, false));
    fixed.addTransition(Transition.create('n7', 'n8', [], 1, true));
    fixed.addTransition(Transition.create('n8', 'n5', []));  // reprocesar loop

    const publishResult = fixed.publish();
    if (publishResult.isFail()) {
      throw new Error(
        `[ProcessTemplateSeeder] Failed to publish "Orden de Trabajo": ${publishResult.error}`,
      );
    }

    await this.repo.save(fixed);
  }
}
