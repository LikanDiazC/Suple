import { Injectable } from '@nestjs/common';
import { Task, TaskStatus } from '../../domain/entities/Task';
import {
  ITaskRepository,
  TaskQuery,
} from '../../domain/repositories/ITaskRepository';
import { BaseInMemoryRepository } from '../../../../shared/infrastructure/BaseInMemoryRepository';

@Injectable()
export class InMemoryTaskRepository
  extends BaseInMemoryRepository<Task>
  implements ITaskRepository
{
  async findByInstanceAndNode(
    tenantId: string,
    instanceId: string,
    nodeId: string,
  ): Promise<Task[]> {
    return this.allForTenant(tenantId).filter(
      (task) => task.instanceId === instanceId && task.nodeId === nodeId,
    );
  }

  async findOverdue(tenantId: string, before: Date): Promise<Task[]> {
    const overdueStatuses = new Set<TaskStatus>([
      TaskStatus.PENDING,
      TaskStatus.IN_PROGRESS,
      TaskStatus.OVERDUE,
    ]);

    return this.allForTenant(tenantId).filter(
      (task) =>
        task.dueDate !== null &&
        task.dueDate < before &&
        overdueStatuses.has(task.status),
    );
  }

  async list(query: TaskQuery): Promise<{ items: Task[]; total: number }> {
    const filtered = this.allForTenant(query.tenantId).filter((task) => {
      // Assignee filter — OR logic between userId and role
      if (query.assigneeUserId !== undefined || query.assigneeRole !== undefined) {
        const matchesUser =
          query.assigneeUserId !== undefined &&
          task.assigneeUserId === query.assigneeUserId;
        const matchesRole =
          query.assigneeRole !== undefined &&
          task.assigneeRole === query.assigneeRole;
        if (!matchesUser && !matchesRole) return false;
      }

      // Status filter — supports single value or array
      if (query.status !== undefined) {
        if (Array.isArray(query.status)) {
          if (!query.status.includes(task.status)) return false;
        } else {
          if (task.status !== query.status) return false;
        }
      }

      if (query.nodeId && task.nodeId !== query.nodeId) return false;
      if (query.instanceId && task.instanceId !== query.instanceId) return false;

      return true;
    });

    return this.paginate(filtered, query.page, query.limit);
  }
}
