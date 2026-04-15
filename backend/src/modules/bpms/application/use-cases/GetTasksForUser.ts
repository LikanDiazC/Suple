import { Injectable, Inject } from '@nestjs/common';
import { Result } from '../../../../shared/kernel';
import { TaskStatus } from '../../domain/entities/Task';
import {
  ITaskRepository,
  TASK_REPOSITORY,
} from '../../domain/repositories/ITaskRepository';

// ── Query / Result ────────────────────────────────────────────────────────────

export interface GetTasksForUserQuery {
  tenantId: string;
  userId:   string;
  roles?:   string[];
  status?:  TaskStatus[];
  page:     number;
  limit:    number;
}

export interface TaskSummary {
  id:             string;
  name:           string;
  instanceId:     string;
  definitionId:   string;
  status:         TaskStatus;
  assigneeUserId: string | null;
  assigneeRole:   string | null;
  dueDate:        string | null;
  isOverdue:      boolean;
  outcome:        string | null;
  createdAt:      string;
}

export interface GetTasksForUserResult {
  items: TaskSummary[];
  total: number;
  page:  number;
  limit: number;
}

// ── Use Case ──────────────────────────────────────────────────────────────────

@Injectable()
export class GetTasksForUser {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepo: ITaskRepository,
  ) {}

  async execute(
    query: GetTasksForUserQuery,
  ): Promise<Result<GetTasksForUserResult>> {
    const now = new Date();

    // Terminal statuses — tasks in these states are never overdue.
    const terminalStatuses = new Set<TaskStatus>([
      TaskStatus.COMPLETED,
      TaskStatus.CANCELLED,
    ]);

    // Collect results: tasks directly assigned to the user OR to any of their
    // roles.  We query by userId first, then by each role, and de-duplicate.
    const seenIds = new Set<string>();
    const allItems: TaskSummary[] = [];
    let total = 0;

    // ── Query by direct assignee ──────────────────────────────────────────────
    const byUser = await this.taskRepo.list({
      tenantId:        query.tenantId,
      assigneeUserId:  query.userId,
      status:          query.status,
      page:            query.page,
      limit:           query.limit,
    });

    for (const task of byUser.items) {
      if (seenIds.has(task.id.toString())) continue;
      seenIds.add(task.id.toString());

      const isOverdue =
        task.dueDate !== null &&
        task.dueDate < now &&
        !terminalStatuses.has(task.status);

      allItems.push({
        id:             task.id.toString(),
        name:           task.name,
        instanceId:     task.instanceId,
        definitionId:   task.definitionId,
        status:         task.status,
        assigneeUserId: task.assigneeUserId,
        assigneeRole:   task.assigneeRole,
        dueDate:        task.dueDate ? task.dueDate.toISOString() : null,
        isOverdue,
        outcome:        task.outcome,
        createdAt:      task.createdAt.toISOString(),
      });
    }
    total += byUser.total;

    // ── Query by each role ────────────────────────────────────────────────────
    if (query.roles && query.roles.length > 0) {
      for (const role of query.roles) {
        const byRole = await this.taskRepo.list({
          tenantId:     query.tenantId,
          assigneeRole: role,
          status:       query.status,
          page:         query.page,
          limit:        query.limit,
        });

        for (const task of byRole.items) {
          if (seenIds.has(task.id.toString())) continue;
          seenIds.add(task.id.toString());

          const isOverdue =
            task.dueDate !== null &&
            task.dueDate < now &&
            !terminalStatuses.has(task.status);

          allItems.push({
            id:             task.id.toString(),
            name:           task.name,
            instanceId:     task.instanceId,
            definitionId:   task.definitionId,
            status:         task.status,
            assigneeUserId: task.assigneeUserId,
            assigneeRole:   task.assigneeRole,
            dueDate:        task.dueDate ? task.dueDate.toISOString() : null,
            isOverdue,
            outcome:        task.outcome,
            createdAt:      task.createdAt.toISOString(),
          });
        }

        total += byRole.total;
      }
    }

    return Result.ok({
      items: allItems,
      total,
      page:  query.page,
      limit: query.limit,
    });
  }
}
