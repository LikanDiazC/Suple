import { Injectable, Inject } from '@nestjs/common';
import { Result } from '../../../../shared/kernel';
import { Task } from '../../domain/entities/Task';
import {
  ITaskRepository,
  TASK_REPOSITORY,
} from '../../domain/repositories/ITaskRepository';
import {
  ProcessInstance,
  ProcessInstanceStatus,
} from '../../domain/entities/ProcessInstance';
import {
  IProcessInstanceRepository,
  PROCESS_INSTANCE_REPOSITORY,
} from '../../domain/repositories/IProcessInstanceRepository';
import { DAGExecutionEngine, NodeType, ProcessGraph } from '../../domain/services/DAGExecutionEngine';
import { EventBus } from '../../../../infrastructure/messaging/events/EventBus';

// ── Command / Result ──────────────────────────────────────────────────────────

export interface CompleteTaskCommand {
  tenantId:    string;
  taskId:      string;
  completedBy: string;
  outcome:     string;
  submission?: Record<string, unknown>;
}

export interface CompleteTaskResult {
  taskId:            string;
  instanceId:        string;
  newTaskIds:        string[];
  instanceCompleted: boolean;
}

// ── Use Case ──────────────────────────────────────────────────────────────────

@Injectable()
export class CompleteTask {
  private static readonly MAX_GATEWAY_DEPTH = 10;

  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepo: ITaskRepository,
    @Inject(PROCESS_INSTANCE_REPOSITORY)
    private readonly instanceRepo: IProcessInstanceRepository,
    private readonly engine: DAGExecutionEngine,
    private readonly eventBus: EventBus,
  ) {}

  async execute(cmd: CompleteTaskCommand): Promise<Result<CompleteTaskResult>> {
    // 1. Load the task
    const task = await this.taskRepo.findById(cmd.tenantId, cmd.taskId);
    if (!task) {
      return Result.fail(`Task not found: ${cmd.taskId}`);
    }

    // 2. Complete the task
    const completeResult = task.complete(cmd.completedBy, cmd.outcome, cmd.submission);
    if (completeResult.isFail()) {
      return Result.fail(completeResult.error);
    }

    // 3. Load the instance
    const instance = await this.instanceRepo.findById(
      cmd.tenantId,
      task.instanceId,
    );
    if (!instance) {
      return Result.fail(`ProcessInstance not found: ${task.instanceId}`);
    }

    // 4. Update instance variables
    instance.setVariable('outcome', cmd.outcome);
    instance.setVariable('lastCompletedNodeId', task.nodeId);
    instance.setVariable('lastCompletedBy', cmd.completedBy);

    if (cmd.submission) {
      instance.mergeVariables(cmd.submission);
    }

    // 5. Resolve next nodes from the completed task's node
    const graph = instance.definitionSnapshot;
    const nextResult = this.engine.resolveNextNodes(
      graph,
      task.nodeId,
      instance.variables,
    );
    if (nextResult.isFail()) {
      return Result.fail(nextResult.error);
    }

    const toNodeIds = nextResult.value.toNodeIds;

    // 6. Advance the instance past the completed node
    instance.completeNode(task.nodeId, toNodeIds);

    // 7. Walk the resolved nodes, handling gateway chaining and task creation
    const newTasks: Task[] = [];

    await this.processNodes(
      cmd.tenantId,
      graph,
      instance,
      toNodeIds,
      task.definitionId,
      newTasks,
      0,
    );

    // 8. Persist task, instance, and any new tasks
    await this.taskRepo.save(task);
    await this.instanceRepo.save(instance);
    if (newTasks.length > 0) {
      await this.taskRepo.saveMany(newTasks);
    }

    // 9. Emit domain events: task first, then instance (if completed), then new tasks
    const taskEvents = task.clearEvents();
    await this.eventBus.publishAll(taskEvents);

    const instanceEvents = instance.clearEvents();
    await this.eventBus.publishAll(instanceEvents);

    for (const newTask of newTasks) {
      const newTaskEvents = newTask.clearEvents();
      await this.eventBus.publishAll(newTaskEvents);
    }

    return Result.ok({
      taskId:            task.id.toString(),
      instanceId:        instance.id.toString(),
      newTaskIds:        newTasks.map((t) => t.id.toString()),
      instanceCompleted: instance.status === ProcessInstanceStatus.COMPLETED,
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Recursively processes a list of node IDs:
   *   - USER_TASK  → creates a Task and stops recursion on that branch.
   *   - SERVICE_TASK → marks node complete, advances to its successors.
   *   - EXCLUSIVE_GATEWAY / PARALLEL_GATEWAY / INCLUSIVE_GATEWAY
   *                → resolves their successors and recurses (up to MAX_GATEWAY_DEPTH).
   *   - END_EVENT  → completes the instance.
   *   - Other      → skipped.
   */
  private async processNodes(
    tenantId: string,
    graph: ProcessGraph,
    instance: ProcessInstance,
    nodeIds: string[],
    definitionId: string,
    newTasks: Task[],
    depth: number,
  ): Promise<void> {
    if (depth >= CompleteTask.MAX_GATEWAY_DEPTH) {
      // Prevent runaway recursion on pathological graphs.
      return;
    }

    for (const nodeId of nodeIds) {
      const node = graph.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      switch (node.type) {
        case NodeType.USER_TASK: {
          const config = node.metadata as {
            assigneeUserId?: string;
            assigneeRole?:   string;
            slaHours?:       number;
            description?:    string;
            approvalOutcomes?: string[];
          };
          const newTask = Task.create(tenantId, {
            instanceId:       instance.id.toString(),
            definitionId,
            nodeId:           node.id,
            name:             node.name,
            description:      config.description ?? '',
            assigneeUserId:   config.assigneeUserId ?? null,
            assigneeRole:     config.assigneeRole ?? null,
            slaHours:         config.slaHours,
            approvalOutcomes: config.approvalOutcomes,
          });
          newTasks.push(newTask);
          break;
        }

        case NodeType.SERVICE_TASK: {
          // In a complete implementation this would invoke an external service.
          // Here we auto-advance past the service task.
          const serviceNextResult = this.engine.resolveNextNodes(
            graph,
            node.id,
            instance.variables,
          );
          if (serviceNextResult.isFail()) break;

          const serviceNextIds = serviceNextResult.value.toNodeIds;
          instance.completeNode(node.id, serviceNextIds);

          await this.processNodes(
            tenantId,
            graph,
            instance,
            serviceNextIds,
            definitionId,
            newTasks,
            depth + 1,
          );
          break;
        }

        case NodeType.PARALLEL_GATEWAY: {
          // AND-gateway: may act as FORK (1 incoming, N outgoing) or
          // JOIN (N incoming, 1+ outgoing). Joins require synchronization:
          // all incoming branches must arrive before we proceed.
          const incomingCount = graph.transitions.filter(
            (t) => t.toNodeId === node.id,
          ).length;

          if (incomingCount > 1) {
            // JOIN: register this branch's arrival
            const arrivals = instance.registerJoinArrival(node.id);
            if (arrivals < incomingCount) {
              // Not all parallel branches have arrived — keep in activeNodeIds, wait.
              break;
            }
            // All branches arrived — fall through to resolve outgoing transitions.
          }

          const parallelNextResult = this.engine.resolveNextNodes(
            graph,
            node.id,
            instance.variables,
          );
          if (parallelNextResult.isFail()) break;

          const parallelNextIds = parallelNextResult.value.toNodeIds;
          instance.completeNode(node.id, parallelNextIds);

          await this.processNodes(
            tenantId,
            graph,
            instance,
            parallelNextIds,
            definitionId,
            newTasks,
            depth + 1,
          );
          break;
        }

        case NodeType.EXCLUSIVE_GATEWAY:
        case NodeType.INCLUSIVE_GATEWAY: {
          // XOR / OR gateways — route based on conditions, no synchronization.
          const gatewayNextResult = this.engine.resolveNextNodes(
            graph,
            node.id,
            instance.variables,
          );
          if (gatewayNextResult.isFail()) break;

          const gatewayNextIds = gatewayNextResult.value.toNodeIds;
          instance.completeNode(node.id, gatewayNextIds);

          await this.processNodes(
            tenantId,
            graph,
            instance,
            gatewayNextIds,
            definitionId,
            newTasks,
            depth + 1,
          );
          break;
        }

        case NodeType.END_EVENT: {
          instance.complete();
          break;
        }

        default:
          // TIMER_EVENT and any future node types: skip for now.
          break;
      }
    }
  }
}
