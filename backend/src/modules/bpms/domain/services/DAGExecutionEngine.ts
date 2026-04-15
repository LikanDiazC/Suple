import { Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel';
import { Transition } from '../value-objects/Transition';
import { BusinessRuleEvaluator } from './BusinessRuleEvaluator';

/**
 * ==========================================================================
 * DAG Execution Engine for BPMN Workflow Processing
 * ==========================================================================
 *
 * Implements a graph executor for BPMN-based business process definitions.
 * The engine:
 *
 *   1. Validates the graph structure (reachability, structural integrity).
 *      Cycles ARE permitted — real BPMN processes have loop-backs
 *      (e.g., rejected → back to review).
 *   2. Resolves the next node(s) from a given state by evaluating
 *      outgoing transitions through the BusinessRuleEvaluator.
 *   3. Supports parallel gateways (fork/join) via multi-target transitions.
 *   4. Detects deadlocks (no valid transition from a non-terminal node).
 *
 * Graph Representation:
 *   - Nodes: Process steps (tasks, gateways, events).
 *   - Edges: Transitions with conditions and priorities.
 *
 * The engine is stateless. Process state (current node, variables)
 * is managed by the ProcessInstance aggregate and persisted externally.
 * ==========================================================================
 */

export enum NodeType {
  START_EVENT = 'START_EVENT',
  END_EVENT = 'END_EVENT',
  USER_TASK = 'USER_TASK',
  SERVICE_TASK = 'SERVICE_TASK',
  EXCLUSIVE_GATEWAY = 'EXCLUSIVE_GATEWAY', // XOR: one outgoing path
  PARALLEL_GATEWAY = 'PARALLEL_GATEWAY',   // AND: all outgoing paths
  INCLUSIVE_GATEWAY = 'INCLUSIVE_GATEWAY',  // OR: one or more paths
  TIMER_EVENT = 'TIMER_EVENT',
}

export interface ProcessNode {
  id: string;
  type: NodeType;
  name: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessGraph {
  nodes: ProcessNode[];
  transitions: Transition[];
}

export interface ExecutionStep {
  fromNodeId: string;
  toNodeIds: string[];
  evaluatedTransitions: Array<{
    transitionTo: string;
    conditionsMet: boolean;
  }>;
}

@Injectable()
export class DAGExecutionEngine {
  private readonly ruleEvaluator = new BusinessRuleEvaluator();

  // -------------------------------------------------------------------------
  // Graph Validation
  // -------------------------------------------------------------------------

  /**
   * Validates the process graph structure.
   * Cycles are allowed (BPMN loop-backs are valid).
   *
   * Checks:
   *   1. Exactly one START_EVENT exists.
   *   2. At least one END_EVENT exists.
   *   3. All transition fromNodeId / toNodeId values reference existing nodes.
   *   4. All nodes are reachable from the START_EVENT via BFS
   *      (prevents unreachable / orphaned nodes that would cause deadlocks).
   *
   * Returns the set of reachable node IDs on success.
   */
  validateGraph(graph: ProcessGraph): Result<string[]> {
    // 1. Exactly one START_EVENT
    const startNodes = graph.nodes.filter((n) => n.type === NodeType.START_EVENT);
    if (startNodes.length !== 1) {
      return Result.fail(
        `Process must have exactly one START_EVENT. Found: ${startNodes.length}`,
      );
    }

    // 2. At least one END_EVENT
    const endNodes = graph.nodes.filter((n) => n.type === NodeType.END_EVENT);
    if (endNodes.length === 0) {
      return Result.fail('Process must have at least one END_EVENT');
    }

    // 3. All transition source/target node IDs must exist in the nodes array
    const nodeIdSet = new Set(graph.nodes.map((n) => n.id));

    for (const transition of graph.transitions) {
      if (!nodeIdSet.has(transition.fromNodeId)) {
        return Result.fail(
          `Transition references unknown source node: ${transition.fromNodeId}`,
        );
      }
      if (!nodeIdSet.has(transition.toNodeId)) {
        return Result.fail(
          `Transition references unknown target node: ${transition.toNodeId}`,
        );
      }
    }

    // 4. BFS from START node — all nodes must be reachable
    const adjacency = new Map<string, string[]>();
    for (const node of graph.nodes) {
      adjacency.set(node.id, []);
    }
    for (const transition of graph.transitions) {
      adjacency.get(transition.fromNodeId)!.push(transition.toNodeId);
    }

    const startNodeId = startNodes[0].id;
    const visited = new Set<string>();
    const queue: string[] = [startNodeId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    const unreachable = graph.nodes
      .filter((n) => !visited.has(n.id))
      .map((n) => n.name);

    if (unreachable.length > 0) {
      return Result.fail(
        `Unreachable nodes detected (deadlock prevention). Nodes not reachable from START: [${unreachable.join(', ')}]`,
      );
    }

    return Result.ok([...visited]);
  }

  // -------------------------------------------------------------------------
  // Transition Resolution
  // -------------------------------------------------------------------------

  /**
   * Given the current node and process variables, determines the next
   * node(s) to activate by evaluating outgoing transitions.
   *
   * Behavior depends on the current node type:
   *   - EXCLUSIVE_GATEWAY: First matching transition (by priority), or default.
   *   - PARALLEL_GATEWAY:  ALL outgoing transitions fire simultaneously.
   *   - INCLUSIVE_GATEWAY:  All matching transitions, or default if none.
   *   - Other nodes:        First matching transition.
   */
  resolveNextNodes(
    graph: ProcessGraph,
    currentNodeId: string,
    processVariables: Record<string, unknown>,
  ): Result<ExecutionStep> {
    const currentNode = graph.nodes.find((n) => n.id === currentNodeId);
    if (!currentNode) {
      return Result.fail(`Node not found: ${currentNodeId}`);
    }

    if (currentNode.type === NodeType.END_EVENT) {
      return Result.ok({
        fromNodeId: currentNodeId,
        toNodeIds: [],
        evaluatedTransitions: [],
      });
    }

    const outgoing = graph.transitions
      .filter((t) => t.fromNodeId === currentNodeId)
      .sort((a, b) => a.priority - b.priority);

    if (outgoing.length === 0) {
      return Result.fail(
        `Deadlock: No outgoing transitions from non-terminal node "${currentNode.name}"`,
      );
    }

    const evaluated = outgoing.map((t) => ({
      transitionTo: t.toNodeId,
      conditionsMet: this.ruleEvaluator.evaluate(t.conditions, processVariables),
      isDefault: t.isDefault,
    }));

    let targetNodeIds: string[];

    switch (currentNode.type) {
      case NodeType.EXCLUSIVE_GATEWAY: {
        // XOR: Take the first matching transition, or the default.
        const match = evaluated.find((e) => e.conditionsMet && !e.isDefault);
        if (match) {
          targetNodeIds = [match.transitionTo];
        } else {
          const defaultTransition = evaluated.find((e) => e.isDefault);
          if (!defaultTransition) {
            return Result.fail(
              `Exclusive gateway "${currentNode.name}" has no matching condition and no default path`,
            );
          }
          targetNodeIds = [defaultTransition.transitionTo];
        }
        break;
      }

      case NodeType.PARALLEL_GATEWAY:
        // AND: All outgoing transitions fire.
        targetNodeIds = outgoing.map((t) => t.toNodeId);
        break;

      case NodeType.INCLUSIVE_GATEWAY: {
        // OR: All matching transitions, fallback to default.
        const matches = evaluated.filter((e) => e.conditionsMet && !e.isDefault);
        if (matches.length > 0) {
          targetNodeIds = matches.map((m) => m.transitionTo);
        } else {
          const defaultTransition = evaluated.find((e) => e.isDefault);
          if (!defaultTransition) {
            return Result.fail(
              `Inclusive gateway "${currentNode.name}" has no matching condition and no default path`,
            );
          }
          targetNodeIds = [defaultTransition.transitionTo];
        }
        break;
      }

      default: {
        // Standard nodes: first matching transition.
        const firstMatch = evaluated.find((e) => e.conditionsMet);
        if (!firstMatch) {
          return Result.fail(
            `No valid transition from node "${currentNode.name}". Check business rules.`,
          );
        }
        targetNodeIds = [firstMatch.transitionTo];
        break;
      }
    }

    return Result.ok({
      fromNodeId: currentNodeId,
      toNodeIds: targetNodeIds,
      evaluatedTransitions: evaluated.map((e) => ({
        transitionTo: e.transitionTo,
        conditionsMet: e.conditionsMet,
      })),
    });
  }

  // -------------------------------------------------------------------------
  // Full Process Execution (Step-Through)
  // -------------------------------------------------------------------------

  /**
   * Executes the process graph from the START_EVENT, stepping through
   * nodes until reaching an END_EVENT or encountering a USER_TASK
   * that requires human intervention.
   *
   * Uses a maxSteps counter (instead of a visited-set) to prevent infinite
   * loops, since cycles are valid in BPMN process graphs.
   *
   * Returns the execution trace (sequence of steps taken) and the
   * node where execution paused or completed.
   */
  executeUntilWait(
    graph: ProcessGraph,
    processVariables: Record<string, unknown>,
    startFromNodeId?: string,
  ): Result<{ trace: ExecutionStep[]; stoppedAt: string; completed: boolean }> {
    const validationResult = this.validateGraph(graph);
    if (validationResult.isFail()) {
      return Result.fail(validationResult.error);
    }

    const startNode = startFromNodeId
      ? graph.nodes.find((n) => n.id === startFromNodeId)
      : graph.nodes.find((n) => n.type === NodeType.START_EVENT);

    if (!startNode) {
      return Result.fail('Cannot determine start node for execution');
    }

    const trace: ExecutionStep[] = [];
    let currentNodeId = startNode.id;
    const maxSteps = 100;
    let steps = 0;

    while (steps < maxSteps) {
      steps++;
      const currentNode = graph.nodes.find((n) => n.id === currentNodeId);
      if (!currentNode) {
        return Result.fail(
          `Execution error: node "${currentNodeId}" referenced by a transition does not exist in the graph`,
        );
      }

      // Terminal condition: END_EVENT reached.
      if (currentNode.type === NodeType.END_EVENT) {
        return Result.ok({ trace, stoppedAt: currentNodeId, completed: true });
      }

      // Pause condition: USER_TASK requires human input.
      if (currentNode.type === NodeType.USER_TASK) {
        return Result.ok({ trace, stoppedAt: currentNodeId, completed: false });
      }

      // Resolve next step.
      const stepResult = this.resolveNextNodes(graph, currentNodeId, processVariables);
      if (stepResult.isFail()) {
        return Result.fail(stepResult.error);
      }

      const step = stepResult.value;
      trace.push(step);

      if (step.toNodeIds.length === 0) {
        return Result.ok({ trace, stoppedAt: currentNodeId, completed: true });
      }

      // NOTE: For parallel gateways this follows only the first branch.
      // Full parallel execution is handled by CompleteTask.processNodes()
      // which iterates ALL toNodeIds and implements AND-gateway join
      // synchronization via ProcessInstance.registerJoinArrival().
      // This method is a linear simulation/preview only.
      currentNodeId = step.toNodeIds[0];
    }

    return Result.fail(
      `Execution exceeded maximum steps (${maxSteps}). Possible infinite loop in graph.`,
    );
  }
}
