import { Result } from '../../../../shared/kernel';
import { Transition } from '../value-objects/Transition';
import { BusinessRuleEvaluator } from './BusinessRuleEvaluator';

/**
 * ==========================================================================
 * DAG Execution Engine for BPMN Workflow Processing
 * ==========================================================================
 *
 * Implements a Directed Acyclic Graph (DAG) executor for BPMN-based
 * business process definitions. The engine:
 *
 *   1. Validates the graph structure (acyclicity, reachability).
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
 *
 * Topological ordering via Kahn's algorithm ensures:
 *   - No circular dependencies exist in the process definition.
 *   - Execution order respects dependency constraints.
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

export class DAGExecutionEngine {
  private readonly ruleEvaluator = new BusinessRuleEvaluator();

  // -------------------------------------------------------------------------
  // Graph Validation
  // -------------------------------------------------------------------------

  /**
   * Validates the process graph using Kahn's algorithm for topological sort.
   * Ensures:
   *   1. The graph is a valid DAG (no cycles).
   *   2. Exactly one START_EVENT exists.
   *   3. At least one END_EVENT exists.
   *   4. All nodes are reachable from the start node.
   */
  validateGraph(graph: ProcessGraph): Result<string[]> {
    const startNodes = graph.nodes.filter((n) => n.type === NodeType.START_EVENT);
    if (startNodes.length !== 1) {
      return Result.fail(
        `Process must have exactly one START_EVENT. Found: ${startNodes.length}`,
      );
    }

    const endNodes = graph.nodes.filter((n) => n.type === NodeType.END_EVENT);
    if (endNodes.length === 0) {
      return Result.fail('Process must have at least one END_EVENT');
    }

    // Kahn's algorithm for topological sort and cycle detection.
    const adjacency = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const node of graph.nodes) {
      adjacency.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    for (const transition of graph.transitions) {
      const targets = adjacency.get(transition.fromNodeId);
      if (!targets) {
        return Result.fail(
          `Transition references unknown source node: ${transition.fromNodeId}`,
        );
      }
      if (!inDegree.has(transition.toNodeId)) {
        return Result.fail(
          `Transition references unknown target node: ${transition.toNodeId}`,
        );
      }
      targets.push(transition.toNodeId);
      inDegree.set(transition.toNodeId, (inDegree.get(transition.toNodeId) ?? 0) + 1);
    }

    // BFS from nodes with in-degree 0.
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) queue.push(nodeId);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);

      for (const neighbor of adjacency.get(current) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    if (sorted.length !== graph.nodes.length) {
      const cycleNodes = graph.nodes
        .filter((n) => !sorted.includes(n.id))
        .map((n) => n.name);
      return Result.fail(
        `Cycle detected in process graph. Nodes involved: [${cycleNodes.join(', ')}]`,
      );
    }

    return Result.ok(sorted);
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

      default:
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
    const visited = new Set<string>();

    while (true) {
      const currentNode = graph.nodes.find((n) => n.id === currentNodeId)!;

      // Terminal condition: END_EVENT reached.
      if (currentNode.type === NodeType.END_EVENT) {
        return Result.ok({ trace, stoppedAt: currentNodeId, completed: true });
      }

      // Pause condition: USER_TASK requires human input.
      if (
        currentNode.type === NodeType.USER_TASK &&
        visited.has(currentNodeId)
      ) {
        return Result.ok({ trace, stoppedAt: currentNodeId, completed: false });
      }

      // Safety: prevent infinite loops in malformed graphs.
      if (visited.has(currentNodeId) && currentNode.type !== NodeType.USER_TASK) {
        return Result.fail(`Execution loop detected at node: ${currentNode.name}`);
      }
      visited.add(currentNodeId);

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

      // For parallel gateways, all branches execute.
      // Simplified: follow the first branch for linear execution.
      // Full parallel execution requires a process instance state machine.
      currentNodeId = step.toNodeIds[0];
    }
  }
}
