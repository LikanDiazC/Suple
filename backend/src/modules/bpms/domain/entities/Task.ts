import { AggregateRoot, UniqueId, Result } from '../../../../shared/kernel';
import { FormField } from '../value-objects/FlowNode';
import { TaskCreatedEvent } from '../events/TaskCreatedEvent';
import { TaskCompletedEvent } from '../events/TaskCompletedEvent';

// ── Supporting types ──────────────────────────────────────────────────────────

export enum TaskStatus {
  PENDING     = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED   = 'COMPLETED',
  CANCELLED   = 'CANCELLED',
  OVERDUE     = 'OVERDUE',
}

export interface TaskComment {
  id:        string;
  authorId:  string;
  content:   string;
  createdAt: Date;
}

export type { FormField };

// ── Props ─────────────────────────────────────────────────────────────────────

interface TaskProps {
  instanceId:      string;
  definitionId:    string;
  nodeId:          string;
  name:            string;
  description:     string;
  status:          TaskStatus;
  assigneeUserId:  string | null;
  assigneeRole:    string | null;
  claimedBy:       string | null;
  claimedAt:       Date | null;
  completedBy:     string | null;
  completedAt:     Date | null;
  /** Calculated from SLA at creation time (now + slaHours * 3 600 000 ms). */
  dueDate:         Date | null;
  /** The outcome value recorded when the task was completed. */
  outcome:         string | null;
  form:            FormField[];
  /** Allowed outcome values for approval-style tasks. */
  approvalOutcomes: string[];
  /** Form data submitted at completion time. */
  submission:      Record<string, unknown> | null;
  comments:        TaskComment[];
  createdAt:       Date;
  updatedAt:       Date;
}

// ── Aggregate ─────────────────────────────────────────────────────────────────

/**
 * Task — Aggregate Root.
 *
 * Represents a human task created by the BPMS engine for a USER_TASK node.
 * Lifecycle: PENDING → IN_PROGRESS → COMPLETED / CANCELLED / OVERDUE.
 *
 * Domain events emitted:
 *   TaskCreatedEvent    → on create()
 *   TaskCompletedEvent  → on complete()
 */
export class Task extends AggregateRoot<TaskProps> {

  // ── Factory ──────────────────────────────────────────────────────────────────

  static create(
    tenantId: string,
    raw: {
      instanceId:       string;
      definitionId:     string;
      nodeId:           string;
      name:             string;
      description:      string;
      assigneeUserId?:  string | null;
      assigneeRole?:    string | null;
      slaHours?:        number;
      form?:            FormField[];
      approvalOutcomes?: string[];
    },
  ): Task {
    const now     = new Date();
    const dueDate = raw.slaHours != null
      ? new Date(now.getTime() + raw.slaHours * 3_600_000)
      : null;

    const approvalOutcomes =
      raw.approvalOutcomes && raw.approvalOutcomes.length > 0
        ? raw.approvalOutcomes
        : ['APPROVED', 'REJECTED'];

    const task = new Task(UniqueId.create(), tenantId, {
      instanceId:      raw.instanceId,
      definitionId:    raw.definitionId,
      nodeId:          raw.nodeId,
      name:            raw.name,
      description:     raw.description,
      status:          TaskStatus.PENDING,
      assigneeUserId:  raw.assigneeUserId ?? null,
      assigneeRole:    raw.assigneeRole ?? null,
      claimedBy:       null,
      claimedAt:       null,
      completedBy:     null,
      completedAt:     null,
      dueDate,
      outcome:         null,
      form:            raw.form ?? [],
      approvalOutcomes,
      submission:      null,
      comments:        [],
      createdAt:       now,
      updatedAt:       now,
    });

    task.addDomainEvent(
      new TaskCreatedEvent(
        tenantId,
        task.id.toString(),
        raw.instanceId,
        raw.nodeId,
        raw.assigneeUserId ?? null,
        raw.assigneeRole ?? null,
        dueDate,
      ),
    );

    return task;
  }

  static reconstitute(id: string, tenantId: string, props: TaskProps): Task {
    return new Task(UniqueId.from(id), tenantId, props);
  }

  // ── Getters ──────────────────────────────────────────────────────────────────

  get instanceId():       string                          { return this.props.instanceId; }
  get definitionId():     string                          { return this.props.definitionId; }
  get nodeId():           string                          { return this.props.nodeId; }
  get name():             string                          { return this.props.name; }
  get description():      string                          { return this.props.description; }
  get status():           TaskStatus                      { return this.props.status; }
  get assigneeUserId():   string | null                   { return this.props.assigneeUserId; }
  get assigneeRole():     string | null                   { return this.props.assigneeRole; }
  get claimedBy():        string | null                   { return this.props.claimedBy; }
  get claimedAt():        Date | null                     { return this.props.claimedAt; }
  get completedBy():      string | null                   { return this.props.completedBy; }
  get completedAt():      Date | null                     { return this.props.completedAt; }
  get dueDate():          Date | null                     { return this.props.dueDate; }
  get outcome():          string | null                   { return this.props.outcome; }
  get form():             FormField[]                     { return [...this.props.form]; }
  get approvalOutcomes(): string[]                        { return [...this.props.approvalOutcomes]; }
  get submission():       Record<string, unknown> | null  { return this.props.submission; }
  get comments():         TaskComment[]                   { return [...this.props.comments]; }
  get createdAt():        Date                            { return this.props.createdAt; }
  get updatedAt():        Date                            { return this.props.updatedAt; }

  // ── Derived ──────────────────────────────────────────────────────────────────

  get isOpen(): boolean {
    return (
      this.props.status === TaskStatus.PENDING ||
      this.props.status === TaskStatus.IN_PROGRESS ||
      this.props.status === TaskStatus.OVERDUE
    );
  }

  // ── Commands ─────────────────────────────────────────────────────────────────

  /**
   * Claims the task for the given user.
   * Only valid when the task is PENDING.
   */
  claim(userId: string): Result<void> {
    if (this.props.status !== TaskStatus.PENDING) {
      return Result.fail(
        `Cannot claim a task in status "${this.props.status}". Task must be PENDING.`,
      );
    }

    this.props.claimedBy  = userId;
    this.props.claimedAt  = new Date();
    this.props.status     = TaskStatus.IN_PROGRESS;
    this.props.updatedAt  = new Date();

    return Result.ok(undefined);
  }

  /**
   * Completes the task with the given outcome and optional form submission.
   * Valid from PENDING or IN_PROGRESS. Validates the outcome against the
   * allowed approvalOutcomes list (when non-empty).
   */
  complete(
    userId: string,
    outcome: string,
    submission?: Record<string, unknown>,
  ): Result<void> {
    if (
      this.props.status !== TaskStatus.PENDING &&
      this.props.status !== TaskStatus.IN_PROGRESS
    ) {
      return Result.fail(
        `Cannot complete a task in status "${this.props.status}".`,
      );
    }

    if (
      this.props.approvalOutcomes.length > 0 &&
      !this.props.approvalOutcomes.includes(outcome)
    ) {
      return Result.fail(
        `Invalid outcome "${outcome}". Allowed values: [${this.props.approvalOutcomes.join(', ')}]`,
      );
    }

    const now = new Date();
    this.props.completedBy  = userId;
    this.props.completedAt  = now;
    this.props.outcome      = outcome;
    this.props.submission   = submission ?? null;
    this.props.status       = TaskStatus.COMPLETED;
    this.props.updatedAt    = now;

    this.addDomainEvent(
      new TaskCompletedEvent(
        this.tenantId,
        this.id.toString(),
        this.props.instanceId,
        this.props.nodeId,
        outcome,
        userId,
      ),
    );

    return Result.ok(undefined);
  }

  /** Cancels the task. Optionally records a reason in a comment. */
  cancel(reason?: string): void {
    this.props.status    = TaskStatus.CANCELLED;
    this.props.updatedAt = new Date();

    if (reason) {
      this.addComment('system', reason);
    }
  }

  /**
   * Marks the task as OVERDUE.
   * Only valid from PENDING or IN_PROGRESS.
   */
  markOverdue(): void {
    if (
      this.props.status !== TaskStatus.PENDING &&
      this.props.status !== TaskStatus.IN_PROGRESS
    ) {
      return;
    }
    this.props.status    = TaskStatus.OVERDUE;
    this.props.updatedAt = new Date();
  }

  /**
   * Reassigns the task to a new user.
   * Not valid once the task is COMPLETED or CANCELLED.
   */
  reassign(newUserId: string): Result<void> {
    if (
      this.props.status === TaskStatus.COMPLETED ||
      this.props.status === TaskStatus.CANCELLED
    ) {
      return Result.fail(
        `Cannot reassign a task in status "${this.props.status}".`,
      );
    }

    this.props.assigneeUserId = newUserId;
    this.props.claimedBy      = null;
    this.props.claimedAt      = null;
    this.props.updatedAt      = new Date();

    return Result.ok(undefined);
  }

  /** Appends a comment to the task's comment list. */
  addComment(authorId: string, content: string): void {
    this.props.comments.push({
      id:        UniqueId.create().toString(),
      authorId,
      content,
      createdAt: new Date(),
    });
    this.props.updatedAt = new Date();
  }
}
