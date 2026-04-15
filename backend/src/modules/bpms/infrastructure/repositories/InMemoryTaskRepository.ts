import { Injectable } from '@nestjs/common';
import { Task, TaskStatus } from '../../domain/entities/Task';
import {
  ITaskRepository,
  TaskQuery,
} from '../../domain/repositories/ITaskRepository';

@Injectable()
export class InMemoryTaskRepository implements ITaskRepository {
  private readonly store = new Map<string, Task>();

  async findById(tenantId: string, id: string): Promise<Task | null> {
    const task = this.store.get(id);
    if (!task) return null;
    return task.tenantId === tenantId ? task : null;
  }

  async findByInstanceAndNode(
    tenantId: string,
    instanceId: string,
    nodeId: string,
  ): Promise<Task[]> {
    return [...this.store.values()].filter(
      (task) =>
        task.tenantId === tenantId &&
        task.instanceId === instanceId &&
        task.nodeId === nodeId,
    );
  }

  async findOverdue(tenantId: string, before: Date): Promise<Task[]> {
    const overdueStatuses = new Set<TaskStatus>([
      TaskStatus.PENDING,
      TaskStatus.IN_PROGRESS,
      TaskStatus.OVERDUE,
    ]);

    return [...this.store.values()].filter(
      (task) =>
        task.tenantId === tenantId &&
        task.dueDate !== null &&
        task.dueDate < before &&
        overdueStatuses.has(task.status),
    );
  }

  async list(query: TaskQuery): Promise<{ items: Task[]; total: number }> {
    let items = [...this.store.values()].filter((task) => {
      if (task.tenantId !== query.tenantId) return false;

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

    const total = items.length;
    const start = (query.page - 1) * query.limit;
    items = items.slice(start, start + query.limit);

    return { items, total };
  }

  async save(task: Task): Promise<void> {
    this.store.set(task.id.toString(), task);
  }

  async saveMany(tasks: Task[]): Promise<void> {
    for (const task of tasks) {
      this.store.set(task.id.toString(), task);
    }
  }
}
