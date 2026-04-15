import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
  Req,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';

import {
  IProcessDefinitionRepository,
  PROCESS_DEFINITION_REPOSITORY,
} from '../../domain/repositories/IProcessDefinitionRepository';
import {
  IProcessInstanceRepository,
  PROCESS_INSTANCE_REPOSITORY,
} from '../../domain/repositories/IProcessInstanceRepository';
import {
  ITaskRepository,
  TASK_REPOSITORY,
} from '../../domain/repositories/ITaskRepository';
import { ProcessDefinitionStatus } from '../../domain/entities/ProcessDefinition';
import { ProcessInstanceStatus } from '../../domain/entities/ProcessInstance';
import { TaskStatus } from '../../domain/entities/Task';
import { FlowNode, NodeConfig } from '../../domain/value-objects/FlowNode';
import { Transition, TransitionCondition } from '../../domain/value-objects/Transition';
import { NodeType } from '../../domain/services/DAGExecutionEngine';

import { StartProcess as StartProcessUseCase } from '../../application/use-cases/StartProcess';
import { CompleteTask as CompleteTaskUseCase } from '../../application/use-cases/CompleteTask';
import { CreateProcessDefinition as CreateProcessDefinitionUseCase } from '../../application/use-cases/CreateProcessDefinition';
import { GetTasksForUser as GetTasksForUserUseCase } from '../../application/use-cases/GetTasksForUser';

import { resolveTenantId } from '../../../../shared/helpers/resolveTenantId';

// ─────────────────────────────────────────────────────────────────────────────
// Serializers — domain aggregates → plain JSON (no class-transformer)
// ─────────────────────────────────────────────────────────────────────────────

function serializeFlowNode(node: FlowNode) {
  return {
    id:       node.id,
    type:     node.type,
    name:     node.name,
    position: node.position,
    config:   node.config,
  };
}

function serializeTransition(t: Transition) {
  return {
    fromNodeId:  t.fromNodeId,
    toNodeId:    t.toNodeId,
    conditions:  t.conditions,
    priority:    t.priority,
    isDefault:   t.isDefault,
  };
}

function serializeDefinition(def: any, full = false) {
  const base = {
    id:          def.id.toString(),
    tenantId:    def.tenantId,
    name:        def.name,
    description: def.description,
    version:     def.version,
    status:      def.status,
    category:    def.category,
    icon:        def.icon ?? null,
    createdBy:   def.createdBy,
    createdAt:   def.createdAt,
    updatedAt:   def.updatedAt,
  };

  if (!full) return base;

  return {
    ...base,
    nodes:       (def.nodes as FlowNode[]).map(serializeFlowNode),
    transitions: (def.transitions as Transition[]).map(serializeTransition),
  };
}

function serializeInstance(inst: any) {
  return {
    id:                inst.id.toString(),
    tenantId:          inst.tenantId,
    definitionId:      inst.definitionId,
    definitionVersion: inst.definitionVersion,
    status:            inst.status,
    title:             inst.title,
    startedBy:         inst.startedBy,
    startedAt:         inst.startedAt,
    completedAt:       inst.completedAt,
    entityRef:         inst.entityRef,
    activeNodeIds:     inst.activeNodeIds,
    completedNodeIds:  inst.completedNodeIds,
    variables:         inst.variables,
  };
}

function serializeTask(task: any) {
  const dueDate: Date | null = task.dueDate;
  const isTerminal = task.status === 'COMPLETED' || task.status === 'CANCELLED';
  const isOverdue  = !!dueDate && !isTerminal && dueDate.getTime() < Date.now();

  return {
    id:               task.id.toString(),
    tenantId:         task.tenantId,
    instanceId:       task.instanceId,
    definitionId:     task.definitionId,
    nodeId:           task.nodeId,
    name:             task.name,
    description:      task.description,
    status:           task.status,
    assigneeUserId:   task.assigneeUserId,
    assigneeRole:     task.assigneeRole,
    claimedBy:        task.claimedBy,
    claimedAt:        task.claimedAt,
    completedBy:      task.completedBy,
    completedAt:      task.completedAt,
    dueDate:          task.dueDate,
    isOverdue,
    outcome:          task.outcome,
    form:             task.form,
    approvalOutcomes: task.approvalOutcomes,
    submission:       task.submission,
    comments:         task.comments,
    createdAt:        task.createdAt,
    updatedAt:        task.updatedAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────────────────────────────

@Controller('api/bpms')
export class BpmsController {
  constructor(
    @Inject(PROCESS_DEFINITION_REPOSITORY)
    private readonly definitionRepo: IProcessDefinitionRepository,
    @Inject(PROCESS_INSTANCE_REPOSITORY)
    private readonly instanceRepo: IProcessInstanceRepository,
    @Inject(TASK_REPOSITORY)
    private readonly taskRepo: ITaskRepository,
    private readonly startProcess: StartProcessUseCase,
    private readonly completeTask: CompleteTaskUseCase,
    private readonly createDefinition: CreateProcessDefinitionUseCase,
    private readonly getTasksForUser: GetTasksForUserUseCase,
  ) {}

  // ===========================================================================
  // Process Definitions
  // ===========================================================================

  @Get('definitions')
  async listDefinitions(
    @Req() req: Request,
    @Query('status') status?: ProcessDefinitionStatus,
    @Query('category') category?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const tenantId = resolveTenantId(req);
    const { items, total } = await this.definitionRepo.list({
      tenantId,
      status,
      category,
      page:  parseInt(page, 10)  || 1,
      limit: parseInt(limit, 10) || 20,
    });

    return {
      items: items.map((d) => serializeDefinition(d, false)),
      total,
      page:  parseInt(page, 10)  || 1,
      limit: parseInt(limit, 10) || 20,
    };
  }

  @Post('definitions')
  async createProcessDefinition(
    @Req() req: Request,
    @Body() body: {
      name:         string;
      description:  string;
      category:     string;
      icon?:        string;
      createdBy?:   string;
    },
  ) {
    const tenantId = resolveTenantId(req);
    const result = await this.createDefinition.execute({
      tenantId,
      name:        body.name,
      description: body.description ?? '',
      category:    body.category,
      icon:        body.icon,
      createdBy:   body.createdBy ?? 'anonymous',
    });

    if (result.isFail()) {
      throw new BadRequestException(result.error);
    }

    const definition = await this.definitionRepo.findById(tenantId, result.value.definitionId);
    if (!definition) {
      throw new NotFoundException('ProcessDefinition not found after creation');
    }

    return serializeDefinition(definition, true);
  }

  @Get('definitions/:id')
  async getDefinition(@Req() req: Request, @Param('id') id: string) {
    const tenantId = resolveTenantId(req);
    const definition = await this.definitionRepo.findById(tenantId, id);
    if (!definition) {
      throw new NotFoundException(`ProcessDefinition not found: ${id}`);
    }
    return serializeDefinition(definition, true);
  }

  @Post('definitions/:id/nodes')
  async addNode(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: {
      type:     NodeType;
      name:     string;
      position: { x: number; y: number };
      config:   NodeConfig;
    },
  ) {
    const tenantId = resolveTenantId(req);
    const definition = await this.definitionRepo.findById(tenantId, id);
    if (!definition) {
      throw new NotFoundException(`ProcessDefinition not found: ${id}`);
    }

    const nodeId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const node = FlowNode.create(nodeId, body.type, body.name, body.position, body.config);

    const addResult = definition.addNode(node);
    if (addResult.isFail()) {
      throw new UnprocessableEntityException(addResult.error);
    }

    await this.definitionRepo.save(definition);
    return serializeDefinition(definition, true);
  }

  @Delete('definitions/:id/nodes/:nodeId')
  async removeNode(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
  ) {
    const tenantId = resolveTenantId(req);
    const definition = await this.definitionRepo.findById(tenantId, id);
    if (!definition) {
      throw new NotFoundException(`ProcessDefinition not found: ${id}`);
    }

    const removeResult = definition.removeNode(nodeId);
    if (removeResult.isFail()) {
      throw new UnprocessableEntityException(removeResult.error);
    }

    await this.definitionRepo.save(definition);
    return serializeDefinition(definition, true);
  }

  @Post('definitions/:id/transitions')
  async addTransition(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: {
      fromNodeId:   string;
      toNodeId:     string;
      conditions?:  TransitionCondition[];
      priority?:    number;
      isDefault?:   boolean;
    },
  ) {
    const tenantId = resolveTenantId(req);
    const definition = await this.definitionRepo.findById(tenantId, id);
    if (!definition) {
      throw new NotFoundException(`ProcessDefinition not found: ${id}`);
    }

    const transition = Transition.create(
      body.fromNodeId,
      body.toNodeId,
      body.conditions ?? [],
      body.priority ?? 0,
      body.isDefault ?? false,
    );

    const addResult = definition.addTransition(transition);
    if (addResult.isFail()) {
      throw new UnprocessableEntityException(addResult.error);
    }

    await this.definitionRepo.save(definition);
    return serializeDefinition(definition, true);
  }

  @Delete('definitions/:id/transitions')
  async removeTransition(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { fromNodeId: string; toNodeId: string },
  ) {
    const tenantId = resolveTenantId(req);
    const definition = await this.definitionRepo.findById(tenantId, id);
    if (!definition) {
      throw new NotFoundException(`ProcessDefinition not found: ${id}`);
    }

    definition.removeTransition(body.fromNodeId, body.toNodeId);
    await this.definitionRepo.save(definition);
    return serializeDefinition(definition, true);
  }

  @Post('definitions/:id/publish')
  @HttpCode(HttpStatus.OK)
  async publishDefinition(@Req() req: Request, @Param('id') id: string) {
    const tenantId = resolveTenantId(req);
    const definition = await this.definitionRepo.findById(tenantId, id);
    if (!definition) {
      throw new NotFoundException(`ProcessDefinition not found: ${id}`);
    }

    const publishResult = definition.publish();
    if (publishResult.isFail()) {
      throw new UnprocessableEntityException(publishResult.error);
    }

    await this.definitionRepo.save(definition);
    return serializeDefinition(definition, true);
  }

  // ===========================================================================
  // Process Instances
  // ===========================================================================

  @Get('instances')
  async listInstances(
    @Req() req: Request,
    @Query('definitionId') definitionId?: string,
    @Query('status') status?: ProcessInstanceStatus,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const tenantId = resolveTenantId(req);
    const { items, total } = await this.instanceRepo.list({
      tenantId,
      definitionId,
      status,
      page:  parseInt(page, 10)  || 1,
      limit: parseInt(limit, 10) || 20,
    });

    return {
      items: items.map(serializeInstance),
      total,
      page:  parseInt(page, 10)  || 1,
      limit: parseInt(limit, 10) || 20,
    };
  }

  @Post('instances')
  async startProcessInstance(
    @Req() req: Request,
    @Body() body: {
      definitionId: string;
      title:        string;
      variables?:   Record<string, unknown>;
      entityRef?:   { type: string; id: string };
      startedBy?:   string;
    },
  ) {
    const tenantId = resolveTenantId(req);
    const result = await this.startProcess.execute({
      tenantId,
      definitionId: body.definitionId,
      title:        body.title,
      variables:    body.variables,
      entityRef:    body.entityRef,
      startedBy:    body.startedBy ?? 'anonymous',
    });

    if (result.isFail()) {
      throw new UnprocessableEntityException(result.error);
    }

    const instance = await this.instanceRepo.findById(tenantId, result.value.instanceId);
    if (!instance) {
      throw new NotFoundException('ProcessInstance not found after creation');
    }

    return {
      ...serializeInstance(instance),
      firstTaskIds: result.value.firstTaskIds,
    };
  }

  @Get('instances/:id')
  async getInstance(@Req() req: Request, @Param('id') id: string) {
    const tenantId = resolveTenantId(req);
    const instance = await this.instanceRepo.findById(tenantId, id);
    if (!instance) {
      throw new NotFoundException(`ProcessInstance not found: ${id}`);
    }
    return serializeInstance(instance);
  }

  @Post('instances/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelInstance(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const tenantId = resolveTenantId(req);
    const instance = await this.instanceRepo.findById(tenantId, id);
    if (!instance) {
      throw new NotFoundException(`ProcessInstance not found: ${id}`);
    }

    if (instance.isTerminal) {
      throw new UnprocessableEntityException(
        `Cannot cancel a ProcessInstance in status "${instance.status}"`,
      );
    }

    instance.cancel(body.reason ?? 'Cancelled via API');
    await this.instanceRepo.save(instance);
    return serializeInstance(instance);
  }

  // ===========================================================================
  // Tasks
  // ===========================================================================

  @Get('tasks')
  async listTasks(
    @Req() req: Request,
    @Query('userId') userId?: string,
    @Query('roles') roles?: string,
    @Query('status') status?: TaskStatus,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const tenantId = resolveTenantId(req);
    const rolesArray = roles ? roles.split(',').map((r) => r.trim()).filter(Boolean) : [];

    const result = await this.getTasksForUser.execute({
      tenantId,
      userId:  userId ?? '',
      roles:   rolesArray,
      status:  status ? [status] : undefined,
      page:    parseInt(page, 10)  || 1,
      limit:   parseInt(limit, 10) || 20,
    });

    if (result.isFail()) {
      throw new BadRequestException(result.error);
    }

    return result.value;
  }

  @Get('tasks/:id')
  async getTask(@Req() req: Request, @Param('id') id: string) {
    const tenantId = resolveTenantId(req);
    const task = await this.taskRepo.findById(tenantId, id);
    if (!task) {
      throw new NotFoundException(`Task not found: ${id}`);
    }
    return serializeTask(task);
  }

  @Post('tasks/:id/claim')
  @HttpCode(HttpStatus.OK)
  async claimTask(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    const tenantId = resolveTenantId(req);
    const task = await this.taskRepo.findById(tenantId, id);
    if (!task) {
      throw new NotFoundException(`Task not found: ${id}`);
    }

    const claimResult = task.claim(body.userId);
    if (claimResult.isFail()) {
      throw new UnprocessableEntityException(claimResult.error);
    }

    await this.taskRepo.save(task);
    return serializeTask(task);
  }

  @Post('tasks/:id/complete')
  @HttpCode(HttpStatus.OK)
  async completeTaskEndpoint(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: {
      outcome:      string;
      submission?:  Record<string, unknown>;
      completedBy?: string;
    },
  ) {
    const tenantId = resolveTenantId(req);

    const result = await this.completeTask.execute({
      tenantId,
      taskId:      id,
      completedBy: body.completedBy ?? 'anonymous',
      outcome:     body.outcome,
      submission:  body.submission,
    });

    if (result.isFail()) {
      throw new UnprocessableEntityException(result.error);
    }

    return result.value;
  }

  @Post('tasks/:id/reassign')
  @HttpCode(HttpStatus.OK)
  async reassignTask(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { newUserId: string },
  ) {
    const tenantId = resolveTenantId(req);
    const task = await this.taskRepo.findById(tenantId, id);
    if (!task) {
      throw new NotFoundException(`Task not found: ${id}`);
    }

    const reassignResult = task.reassign(body.newUserId);
    if (reassignResult.isFail()) {
      throw new UnprocessableEntityException(reassignResult.error);
    }

    await this.taskRepo.save(task);
    return serializeTask(task);
  }

  // ===========================================================================
  // Analytics
  // ===========================================================================

  @Get('analytics/summary')
  async getAnalyticsSummary(@Req() req: Request) {
    const tenantId = resolveTenantId(req);
    const now = new Date();

    // Active instances count
    const { total: activeInstances } = await this.instanceRepo.list({
      tenantId,
      status: ProcessInstanceStatus.ACTIVE,
      page:   1,
      limit:  1,
    });

    // Pending tasks count
    const { total: pendingTasks } = await this.taskRepo.list({
      tenantId,
      status: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS],
      page:   1,
      limit:  1,
    });

    // Overdue tasks: dueDate < now, status not COMPLETED/CANCELLED
    const overdueTasks = await this.taskRepo.findOverdue(tenantId, now);
    const overdueCount = overdueTasks.length;

    // Completed today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const { items: completedTodayItems } = await this.taskRepo.list({
      tenantId,
      status: [TaskStatus.COMPLETED],
      page:   1,
      limit:  10_000,
    });
    const completedToday = completedTodayItems.filter(
      (t) => t.completedAt !== null && t.completedAt >= startOfToday,
    ).length;

    return {
      activeInstances,
      pendingTasks,
      overdueTasks:   overdueCount,
      completedToday,
    };
  }
}
