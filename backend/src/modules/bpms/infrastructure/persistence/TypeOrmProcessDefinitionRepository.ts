import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  IProcessDefinitionRepository,
  ProcessDefinitionQuery,
} from '../../domain/repositories/IProcessDefinitionRepository';
import { ProcessDefinition, ProcessDefinitionStatus } from '../../domain/entities/ProcessDefinition';
import { FlowNode } from '../../domain/value-objects/FlowNode';
import { Transition, TransitionCondition } from '../../domain/value-objects/Transition';
import { NodeType } from '../../domain/services/DAGExecutionEngine';
import { ProcessDefinitionOrmEntity } from './ProcessDefinitionOrmEntity';

interface SerializedNode {
  id: string;
  type: NodeType;
  name: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

interface SerializedTransition {
  fromNodeId: string;
  toNodeId: string;
  conditions: TransitionCondition[];
  priority: number;
  isDefault: boolean;
}

@Injectable()
export class TypeOrmProcessDefinitionRepository implements IProcessDefinitionRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findById(_tenantId: string, id: string): Promise<ProcessDefinition | null> {
    const row = await this.dataSource.transaction((mgr) =>
      mgr.findOne(ProcessDefinitionOrmEntity, { where: { id } }),
    );
    return row ? this.toDomain(row) : null;
  }

  async findByIdAnyTenant(id: string): Promise<ProcessDefinition | null> {
    const row = await this.dataSource.transaction((mgr) =>
      mgr.findOne(ProcessDefinitionOrmEntity, { where: { id } }),
    );
    return row ? this.toDomain(row) : null;
  }

  async list(query: ProcessDefinitionQuery): Promise<{ items: ProcessDefinition[]; total: number }> {
    return this.dataSource.transaction(async (mgr) => {
      const qb = mgr.createQueryBuilder(ProcessDefinitionOrmEntity, 'd')
        .where('(d.tenant_id IS NULL OR d.tenant_id = :tid)', { tid: query.tenantId });
      if (query.status) qb.andWhere('d.status = :s', { s: query.status });
      if (query.category) qb.andWhere('d.category = :c', { c: query.category });
      qb.orderBy('d.created_at', 'DESC')
        .skip((query.page - 1) * query.limit)
        .take(query.limit);
      const [rows, total] = await qb.getManyAndCount();
      return { items: rows.map((r) => this.toDomain(r)), total };
    });
  }

  async save(definition: ProcessDefinition): Promise<void> {
    const props = (definition as unknown as { props: {
      name: string; description: string; version: number;
      status: ProcessDefinitionStatus; nodes: FlowNode[]; transitions: Transition[];
      category: string; icon?: string; createdBy: string; createdAt: Date; updatedAt: Date;
    } }).props;

    const nodes: SerializedNode[] = props.nodes.map((n) => ({
      id: n.id, type: n.type, name: n.name, position: n.position,
      config: n.config as unknown as Record<string, unknown>,
    }));
    const transitions: SerializedTransition[] = props.transitions.map((t) => ({
      fromNodeId: t.fromNodeId, toNodeId: t.toNodeId, conditions: t.conditions,
      priority: t.priority, isDefault: t.isDefault,
    }));

    await this.dataSource.transaction((mgr) =>
      mgr.upsert(
        ProcessDefinitionOrmEntity,
        {
          id: definition.id.toString(),
          tenantId: definition.tenantId || null,
          name: props.name,
          description: props.description,
          version: props.version,
          status: props.status,
          category: props.category,
          icon: props.icon ?? null,
          nodes,
          transitions,
          createdBy: props.createdBy,
          createdAt: props.createdAt,
          updatedAt: new Date(),
        },
        ['id'],
      ),
    );
  }

  private toDomain(row: ProcessDefinitionOrmEntity): ProcessDefinition {
    const nodes = (row.nodes as SerializedNode[]).map((n) =>
      FlowNode.create(n.id, n.type, n.name, n.position, n.config as Parameters<typeof FlowNode.create>[4]),
    );
    const transitions = (row.transitions as SerializedTransition[]).map((t) =>
      Transition.create(t.fromNodeId, t.toNodeId, t.conditions, t.priority, t.isDefault),
    );
    return ProcessDefinition.reconstitute(row.id, row.tenantId ?? '', {
      name: row.name,
      description: row.description,
      version: row.version,
      status: row.status as ProcessDefinitionStatus,
      nodes,
      transitions,
      category: row.category,
      icon: row.icon ?? undefined,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

}
