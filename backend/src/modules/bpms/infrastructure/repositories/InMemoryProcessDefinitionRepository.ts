import { Injectable } from '@nestjs/common';
import { ProcessDefinition } from '../../domain/entities/ProcessDefinition';
import {
  IProcessDefinitionRepository,
  ProcessDefinitionQuery,
} from '../../domain/repositories/IProcessDefinitionRepository';

@Injectable()
export class InMemoryProcessDefinitionRepository
  implements IProcessDefinitionRepository
{
  private readonly store = new Map<string, ProcessDefinition>();

  async findById(
    tenantId: string,
    id: string,
  ): Promise<ProcessDefinition | null> {
    const definition = this.store.get(id);
    if (!definition) return null;
    return definition.tenantId === tenantId ? definition : null;
  }

  async findByIdAnyTenant(id: string): Promise<ProcessDefinition | null> {
    return this.store.get(id) ?? null;
  }

  async list(
    query: ProcessDefinitionQuery,
  ): Promise<{ items: ProcessDefinition[]; total: number }> {
    let items = [...this.store.values()].filter((definition) => {
      if (definition.tenantId !== query.tenantId) return false;
      if (query.status && definition.status !== query.status) return false;
      if (query.category && definition.category !== query.category) return false;
      return true;
    });

    const total = items.length;
    const start = (query.page - 1) * query.limit;
    items = items.slice(start, start + query.limit);

    return { items, total };
  }

  async save(definition: ProcessDefinition): Promise<void> {
    this.store.set(definition.id.toString(), definition);
  }
}
