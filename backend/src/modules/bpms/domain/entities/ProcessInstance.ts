import { AggregateRoot, UniqueId, Result } from '../../../../shared/kernel';
import { ProcessGraph } from '../services/DAGExecutionEngine';
import { ProcessInstanceStartedEvent } from '../events/ProcessInstanceStartedEvent';
import { ProcessInstanceCompletedEvent } from '../events/ProcessInstanceCompletedEvent';
import { ProcessInstanceCancelledEvent } from '../events/ProcessInstanceCancelledEvent';

// ── Status ────────────────────────────────────────────────────────────────────

export enum ProcessInstanceStatus {
  ACTIVE    = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  SUSPENDED = 'SUSPENDED',
  ERROR     = 'ERROR',
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProcessInstanceProps {
  definitionId:       string;
  definitionVersion:  number;
  /** Immutable snapshot of the process graph captured at start time. */
  definitionSnapshot: ProcessGraph;
  status:             ProcessInstanceStatus;
  /** Node IDs currently executing (supports parallel paths). */
  activeNodeIds:      string[];
  /** Ordered audit trail of completed node IDs. */
  completedNodeIds:   string[];
  /** Mutable process context shared across nodes. */
  variables:          Record<string, unknown>;
  /**
   * Tracks how many parallel branches have arrived at each join gateway.
   * Key = gateway nodeId, Value = number of branches that have arrived.
   * Used for AND-gateway synchronization: the join only fires when
   * arrivals === number of incoming transitions.
   */
  joinArrivalCount:   Record<string, number>;
  startedBy:          string;
  startedAt:          Date;
  completedAt:        Date | null;
  /** Human-readable label, e.g. "Pedido #001 - Mesa de madera". */
  title:              string;
  /** Optional link to the domain entity that triggered this instance. */
  entityRef:          { type: string; id: string } | null;
}

// ── Aggregate ─────────────────────────────────────────────────────────────────

/**
 * ProcessInstance — Aggregate Root.
 *
 * Represents a running execution of a process definition.
 * Tracks which nodes are active (parallel paths) and which are
 * already complete (audit trail). Process state is advanced by
 * the application layer after each user-task completion or
 * service-task callback.
 *
 * Domain events emitted:
 *   ProcessInstanceStartedEvent   → on create()
 *   ProcessInstanceCompletedEvent → on complete()
 *   ProcessInstanceCancelledEvent → on cancel()
 */
export class ProcessInstance extends AggregateRoot<ProcessInstanceProps> {

  // ── Factory ──────────────────────────────────────────────────────────────────

  static create(
    tenantId: string,
    raw: {
      definitionId:       string;
      definitionVersion:  number;
      definitionSnapshot: ProcessGraph;
      startedBy:          string;
      title:              string;
      initialNodeId:      string;
      variables?:         Record<string, unknown>;
      entityRef?:         { type: string; id: string } | null;
    },
  ): Result<ProcessInstance> {
    if (!raw.definitionId.trim()) {
      return Result.fail('definitionId is required');
    }
    if (!raw.startedBy.trim()) {
      return Result.fail('startedBy is required');
    }
    if (!raw.title.trim()) {
      return Result.fail('title is required');
    }
    if (!raw.initialNodeId.trim()) {
      return Result.fail('initialNodeId is required');
    }

    const instance = new ProcessInstance(UniqueId.create(), tenantId, {
      definitionId:       raw.definitionId,
      definitionVersion:  raw.definitionVersion,
      definitionSnapshot: raw.definitionSnapshot,
      status:             ProcessInstanceStatus.ACTIVE,
      activeNodeIds:      [raw.initialNodeId],
      completedNodeIds:   [],
      variables:          raw.variables ?? {},
      joinArrivalCount:   {},
      startedBy:          raw.startedBy,
      startedAt:          new Date(),
      completedAt:        null,
      title:              raw.title,
      entityRef:          raw.entityRef ?? null,
    });

    instance.addDomainEvent(
      new ProcessInstanceStartedEvent(
        tenantId,
        instance.id.toString(),
        raw.definitionId,
        raw.title,
        raw.startedBy,
      ),
    );

    return Result.ok(instance);
  }

  static reconstitute(
    id: string,
    tenantId: string,
    props: ProcessInstanceProps,
  ): ProcessInstance {
    return new ProcessInstance(UniqueId.from(id), tenantId, props);
  }

  // ── Getters ──────────────────────────────────────────────────────────────────

  get definitionId():       string                           { return this.props.definitionId; }
  get definitionVersion():  number                           { return this.props.definitionVersion; }
  get definitionSnapshot(): ProcessGraph                     { return this.props.definitionSnapshot; }
  get status():             ProcessInstanceStatus            { return this.props.status; }
  get activeNodeIds():      string[]                         { return [...this.props.activeNodeIds]; }
  get completedNodeIds():   string[]                         { return [...this.props.completedNodeIds]; }
  get variables():          Record<string, unknown>          { return { ...this.props.variables }; }
  get joinArrivalCount():   Record<string, number>           { return { ...this.props.joinArrivalCount }; }
  get startedBy():          string                           { return this.props.startedBy; }
  get startedAt():          Date                             { return this.props.startedAt; }
  get completedAt():        Date | null                      { return this.props.completedAt; }
  get title():              string                           { return this.props.title; }
  get entityRef():          { type: string; id: string } | null { return this.props.entityRef; }

  // ── Derived ──────────────────────────────────────────────────────────────────

  get isActive(): boolean {
    return this.props.status === ProcessInstanceStatus.ACTIVE;
  }

  get isTerminal(): boolean {
    return (
      this.props.status === ProcessInstanceStatus.COMPLETED ||
      this.props.status === ProcessInstanceStatus.CANCELLED
    );
  }

  // ── Commands ─────────────────────────────────────────────────────────────────

  /**
   * Moves execution to a new node, replacing the current active node.
   * The previously active node (if present) is added to completedNodeIds.
   */
  advanceToNode(nodeId: string): void {
    const previousActive = [...this.props.activeNodeIds];
    this.props.activeNodeIds = [nodeId];
    for (const id of previousActive) {
      if (!this.props.completedNodeIds.includes(id)) {
        this.props.completedNodeIds.push(id);
      }
    }
  }

  /**
   * Marks nodeId as completed and activates nextNodeIds.
   * If nextNodeIds is empty and no other nodes remain active, the instance
   * transitions to COMPLETED automatically.
   *
   * Guards:
   *   - If nodeId is NOT in activeNodeIds the call is a no-op (prevents state corruption).
   */
  completeNode(nodeId: string, nextNodeIds: string[]): void {
    if (!this.props.activeNodeIds.includes(nodeId)) {
      return; // Node not active — no-op to prevent state corruption
    }

    this.props.activeNodeIds = this.props.activeNodeIds.filter((id) => id !== nodeId);

    if (!this.props.completedNodeIds.includes(nodeId)) {
      this.props.completedNodeIds.push(nodeId);
    }

    for (const id of nextNodeIds) {
      if (!this.props.activeNodeIds.includes(id)) {
        this.props.activeNodeIds.push(id);
      }
    }

    if (nextNodeIds.length === 0 && this.props.activeNodeIds.length === 0) {
      this.complete();
    }
  }

  /**
   * Registers the arrival of one parallel branch at a join gateway node.
   * Returns the updated total number of arrivals for that node.
   */
  registerJoinArrival(nodeId: string): number {
    this.props.joinArrivalCount[nodeId] =
      (this.props.joinArrivalCount[nodeId] ?? 0) + 1;
    return this.props.joinArrivalCount[nodeId];
  }

  /**
   * Returns the current number of parallel branches that have arrived
   * at the given join gateway node.
   */
  getJoinArrivals(nodeId: string): number {
    return this.props.joinArrivalCount[nodeId] ?? 0;
  }

  /** Transitions the instance to COMPLETED and emits the corresponding event. */
  complete(): void {
    this.props.status      = ProcessInstanceStatus.COMPLETED;
    this.props.completedAt = new Date();

    this.addDomainEvent(
      new ProcessInstanceCompletedEvent(
        this.tenantId,
        this.id.toString(),
        this.props.definitionId,
        this.props.title,
        this.props.completedAt,
      ),
    );
  }

  /** Transitions the instance to CANCELLED and emits the corresponding event. */
  cancel(reason: string): void {
    this.props.status = ProcessInstanceStatus.CANCELLED;

    this.addDomainEvent(
      new ProcessInstanceCancelledEvent(
        this.tenantId,
        this.id.toString(),
        this.props.definitionId,
        reason,
      ),
    );
  }

  /** Suspends an active instance. */
  suspend(): void {
    if (this.props.status !== ProcessInstanceStatus.ACTIVE) {
      throw new Error(
        `Cannot suspend a ProcessInstance in status "${this.props.status}"`,
      );
    }
    this.props.status = ProcessInstanceStatus.SUSPENDED;
  }

  /** Resumes a suspended instance back to ACTIVE. */
  resume(): void {
    if (this.props.status !== ProcessInstanceStatus.SUSPENDED) {
      throw new Error(
        `Cannot resume a ProcessInstance in status "${this.props.status}"`,
      );
    }
    this.props.status = ProcessInstanceStatus.ACTIVE;
  }

  /** Sets a single variable in the process context. */
  setVariable(key: string, value: unknown): void {
    this.props.variables[key] = value;
  }

  /** Merges a map of variables into the process context. */
  mergeVariables(vars: Record<string, unknown>): void {
    Object.assign(this.props.variables, vars);
  }
}
