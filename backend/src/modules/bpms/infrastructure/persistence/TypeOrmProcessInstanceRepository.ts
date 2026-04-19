import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  IProcessInstanceRepository,
  ProcessInstanceQuery,
} from '../../domain/repositories/IProcessInstanceRepository';
import { ProcessInstance, ProcessInstanceStatus } from '../../domain/entities/ProcessInstance';
import { ProcessGraph } from '../../domain/services/DAGExecutionEngine';
import { ProcessInstanceOrmEntity } from './ProcessInstanceOrmEntity';

@Injectable()
export class TypeOrmProcessInstanceRepository implements IProcessInstanceRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findById(_tenantId: string, id: string): Promise<ProcessInstance | null> {
    const row = await this.dataSource.transaction((mgr) =>
      mgr.findOne(ProcessInstanceOrmEntity, { where: { id } }),
    );
    return row ? this.toDomain(row) : null;
  }

  async list(query: ProcessInstanceQuery): Promise<{ items: ProcessInstance[]; total: number }> {
    return this.dataSource.transaction(async (mgr) => {
      const qb = mgr.createQueryBuilder(ProcessInstanceOrmEntity, 'i');
      if (query.definitionId) qb.andWhere('i.definition_id = :d', { d: query.definitionId });
      if (query.status) qb.andWhere('i.status = :s', { s: query.status });
      if (query.startedBy) qb.andWhere('i.started_by = :sb', { sb: query.startedBy });
      qb.orderBy('i.started_at', 'DESC')
        .skip((query.page - 1) * query.limit)
        .take(query.limit);
      const [rows, total] = await qb.getManyAndCount();
      return { items: rows.map((r) => this.toDomain(r)), total };
    });
  }

  async save(instance: ProcessInstance): Promise<void> {
    await this.dataSource.transaction((mgr) =>
      mgr.upsert(
        ProcessInstanceOrmEntity,
        {
          id: instance.id.toString(),
          tenantId: instance.tenantId,
          definitionId: instance.definitionId,
          definitionVersion: instance.definitionVersion,
          definitionSnapshot: instance.definitionSnapshot,
          status: instance.status,
          activeNodeIds: instance.activeNodeIds,
          completedNodeIds: instance.completedNodeIds,
          variables: instance.variables as object,
          joinArrivalCount: instance.joinArrivalCount as object,
          startedBy: instance.startedBy,
          startedAt: instance.startedAt,
          completedAt: instance.completedAt,
          title: instance.title,
          entityRef: instance.entityRef,
        } as object,
        ['id'],
      ),
    );
  }

  private toDomain(row: ProcessInstanceOrmEntity): ProcessInstance {
    return ProcessInstance.reconstitute(row.id, row.tenantId, {
      definitionId: row.definitionId,
      definitionVersion: row.definitionVersion,
      definitionSnapshot: row.definitionSnapshot as ProcessGraph,
      status: row.status as ProcessInstanceStatus,
      activeNodeIds: row.activeNodeIds,
      completedNodeIds: row.completedNodeIds,
      variables: row.variables,
      joinArrivalCount: row.joinArrivalCount,
      startedBy: row.startedBy,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      title: row.title,
      entityRef: row.entityRef,
    });
  }
}
