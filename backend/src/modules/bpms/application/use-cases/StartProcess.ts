import { Injectable, Inject } from '@nestjs/common';
import { Result } from '../../../../shared/kernel';
import {
  ProcessDefinitionStatus,
} from '../../domain/entities/ProcessDefinition';
import {
  IProcessDefinitionRepository,
  PROCESS_DEFINITION_REPOSITORY,
} from '../../domain/repositories/IProcessDefinitionRepository';
import {
  ProcessInstance,
} from '../../domain/entities/ProcessInstance';
import {
  IProcessInstanceRepository,
  PROCESS_INSTANCE_REPOSITORY,
} from '../../domain/repositories/IProcessInstanceRepository';
import { Task } from '../../domain/entities/Task';
import {
  ITaskRepository,
  TASK_REPOSITORY,
} from '../../domain/repositories/ITaskRepository';
import { DAGExecutionEngine, NodeType } from '../../domain/services/DAGExecutionEngine';
import { EventBus } from '../../../../infrastructure/messaging/events/EventBus';

// ── Command / Result ──────────────────────────────────────────────────────────

export interface StartProcessCommand {
  tenantId:    string;
  definitionId: string;
  startedBy:   string;
  title:       string;
  variables?:  Record<string, unknown>;
  entityRef?:  { type: string; id: string };
}

export interface StartProcessResult {
  instanceId:   string;
  firstTaskIds: string[];
}

// ── Use Case ──────────────────────────────────────────────────────────────────

@Injectable()
export class StartProcess {
  constructor(
    @Inject(PROCESS_DEFINITION_REPOSITORY)
    private readonly definitionRepo: IProcessDefinitionRepository,
    @Inject(PROCESS_INSTANCE_REPOSITORY)
    private readonly instanceRepo: IProcessInstanceRepository,
    @Inject(TASK_REPOSITORY)
    private readonly taskRepo: ITaskRepository,
    private readonly engine: DAGExecutionEngine,
    private readonly eventBus: EventBus,
  ) {}

  async execute(cmd: StartProcessCommand): Promise<Result<StartProcessResult>> {
    // 1. Load definition
    const definition = await this.definitionRepo.findById(
      cmd.tenantId,
      cmd.definitionId,
    );
    if (!definition) {
      return Result.fail(`ProcessDefinition not found: ${cmd.definitionId}`);
    }

    // 2. Must be ACTIVE
    if (definition.status !== ProcessDefinitionStatus.ACTIVE) {
      return Result.fail(
        `ProcessDefinition "${definition.name}" is not ACTIVE (current status: ${definition.status})`,
      );
    }

    // 3. Locate the START_EVENT node
    const graph = definition.toProcessGraph();
    const startEventNode = graph.nodes.find((n) => n.type === NodeType.START_EVENT);
    if (!startEventNode) {
      return Result.fail(
        `ProcessDefinition "${definition.name}" has no START_EVENT node`,
      );
    }

    // 4. Resolve nodes immediately after START_EVENT
    const nextResult = this.engine.resolveNextNodes(
      graph,
      startEventNode.id,
      cmd.variables ?? {},
    );
    if (nextResult.isFail()) {
      return Result.fail(nextResult.error);
    }
    const firstNodeIds = nextResult.value.toNodeIds;

    // 5. Create ProcessInstance (initial active node = START_EVENT)
    const instanceResult = ProcessInstance.create(cmd.tenantId, {
      definitionId:       cmd.definitionId,
      definitionVersion:  definition.version,
      definitionSnapshot: graph,
      startedBy:          cmd.startedBy,
      title:              cmd.title,
      initialNodeId:      startEventNode.id,
      variables:          cmd.variables ?? {},
      entityRef:          cmd.entityRef ?? null,
    });
    if (instanceResult.isFail()) {
      return Result.fail(instanceResult.error);
    }
    const instance = instanceResult.value;

    // 6. Advance instance past the START_EVENT to the first real nodes
    instance.completeNode(startEventNode.id, firstNodeIds);

    // 7. Create tasks / auto-execute service tasks for each first node
    const firstTasks: Task[] = [];

    for (const nodeId of firstNodeIds) {
      const node = graph.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      if (node.type === NodeType.USER_TASK) {
        const config = node.metadata as {
          assigneeUserId?: string;
          assigneeRole?:   string;
          slaHours?:       number;
          description?:    string;
        };
        const task = Task.create(cmd.tenantId, {
          instanceId:    instance.id.toString(),
          definitionId:  cmd.definitionId,
          nodeId:        node.id,
          name:          node.name,
          description:   config.description ?? '',
          assigneeUserId: config.assigneeUserId ?? null,
          assigneeRole:  config.assigneeRole ?? null,
          slaHours:      config.slaHours,
        });
        firstTasks.push(task);
      } else if (node.type === NodeType.SERVICE_TASK) {
        // SERVICE_TASKs auto-execute; mark the node complete immediately.
        instance.completeNode(node.id, []);
      }
      // Gateways and other node types advance automatically — no task needed.
    }

    // 8. Persist instance and tasks
    await this.instanceRepo.save(instance);
    if (firstTasks.length > 0) {
      await this.taskRepo.saveMany(firstTasks);
    }

    // 9. Emit domain events
    const instanceEvents = instance.clearEvents();
    await this.eventBus.publishAll(instanceEvents);

    for (const task of firstTasks) {
      const taskEvents = task.clearEvents();
      await this.eventBus.publishAll(taskEvents);
    }

    return Result.ok({
      instanceId:   instance.id.toString(),
      firstTaskIds: firstTasks.map((t) => t.id.toString()),
    });
  }
}
