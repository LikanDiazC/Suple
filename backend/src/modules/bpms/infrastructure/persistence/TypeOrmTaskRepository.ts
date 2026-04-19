import { Injectable } from '@nestjs/common';
import { DataSource, In, LessThan } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { ITaskRepository, TaskQuery } from '../../domain/repositories/ITaskRepository';
import { Task, TaskStatus, TaskComment, FormField } from '../../domain/entities/Task';
import { TaskOrmEntity } from './TaskOrmEntity';

@Injectable()
export class TypeOrmTaskRepository implements ITaskRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findById(_tenantId: string, id: string): Promise<Task | null> {
    const row = await this.dataSource.transaction((mgr) =>
      mgr.findOne(TaskOrmEntity, { where: { id } }),
    );
    return row ? this.toDomain(row) : null;
  }

  async findByInstanceAndNode(_tenantId: string, instanceId: string, nodeId: string): Promise<Task[]> {
    const rows = await this.dataSource.transaction((mgr) =>
      mgr.find(TaskOrmEntity, { where: { instanceId, nodeId } }),
    );
    return rows.map((r) => this.toDomain(r));
  }

  async findOverdue(_tenantId: string, before: Date): Promise<Task[]> {
    const rows = await this.dataSource.transaction((mgr) =>
      mgr.find(TaskOrmEntity, {
        where: { dueDate: LessThan(before), status: In([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]) },
      }),
    );
    return rows.map((r) => this.toDomain(r));
  }

  async list(query: TaskQuery): Promise<{ items: Task[]; total: number }> {
    return this.dataSource.transaction(async (mgr) => {
      const qb = mgr.createQueryBuilder(TaskOrmEntity, 't');
      if (query.instanceId) qb.andWhere('t.instance_id = :i', { i: query.instanceId });
      if (query.assigneeUserId) qb.andWhere('t.assignee_user_id = :u', { u: query.assigneeUserId });
      if (query.assigneeRole) qb.andWhere('t.assignee_role = :r', { r: query.assigneeRole });
      if (query.nodeId) qb.andWhere('t.node_id = :n', { n: query.nodeId });
      if (query.status) {
        const arr = Array.isArray(query.status) ? query.status : [query.status];
        qb.andWhere('t.status IN (:...st)', { st: arr });
      }
      qb.orderBy('t.created_at', 'DESC')
        .skip((query.page - 1) * query.limit)
        .take(query.limit);
      const [rows, total] = await qb.getManyAndCount();
      return { items: rows.map((r) => this.toDomain(r)), total };
    });
  }

  async save(task: Task): Promise<void> {
    await this.dataSource.transaction((mgr) => mgr.upsert(TaskOrmEntity, this.toOrm(task) as object, ['id']));
  }

  async saveMany(tasks: Task[]): Promise<void> {
    if (tasks.length === 0) return;
    await this.dataSource.transaction((mgr) =>
      mgr.upsert(TaskOrmEntity, tasks.map((t) => this.toOrm(t)) as object[], ['id']),
    );
  }

  private toDomain(row: TaskOrmEntity): Task {
    return Task.reconstitute(row.id, row.tenantId, {
      instanceId: row.instanceId,
      definitionId: row.definitionId,
      nodeId: row.nodeId,
      name: row.name,
      description: row.description,
      status: row.status as TaskStatus,
      assigneeUserId: row.assigneeUserId,
      assigneeRole: row.assigneeRole,
      claimedBy: row.claimedBy,
      claimedAt: row.claimedAt,
      completedBy: row.completedBy,
      completedAt: row.completedAt,
      dueDate: row.dueDate,
      outcome: row.outcome,
      form: row.form as FormField[],
      approvalOutcomes: row.approvalOutcomes,
      submission: row.submission,
      comments: row.comments as TaskComment[],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toOrm(t: Task): Partial<TaskOrmEntity> {
    return {
      id: t.id.toString(),
      tenantId: t.tenantId,
      instanceId: t.instanceId,
      definitionId: t.definitionId,
      nodeId: t.nodeId,
      name: t.name,
      description: t.description,
      status: t.status,
      assigneeUserId: t.assigneeUserId,
      assigneeRole: t.assigneeRole,
      claimedBy: t.claimedBy,
      claimedAt: t.claimedAt,
      completedBy: t.completedBy,
      completedAt: t.completedAt,
      dueDate: t.dueDate,
      outcome: t.outcome,
      form: t.form,
      approvalOutcomes: t.approvalOutcomes,
      submission: t.submission,
      comments: t.comments,
      createdAt: t.createdAt,
      updatedAt: new Date(),
    };
  }
}
