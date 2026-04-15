import { Injectable } from '@nestjs/common';
import { ProcessInstance } from '../../domain/entities/ProcessInstance';
import {
  IProcessInstanceRepository,
  ProcessInstanceQuery,
} from '../../domain/repositories/IProcessInstanceRepository';

@Injectable()
export class InMemoryProcessInstanceRepository
  implements IProcessInstanceRepository
{
  private readonly store = new Map<string, ProcessInstance>();

  async findById(
    tenantId: string,
    id: string,
  ): Promise<ProcessInstance | null> {
    const instance = this.store.get(id);
    if (!instance) return null;
    return instance.tenantId === tenantId ? instance : null;
  }

  async list(
    query: ProcessInstanceQuery,
  ): Promise<{ items: ProcessInstance[]; total: number }> {
    let items = [...this.store.values()].filter((instance) => {
      if (instance.tenantId !== query.tenantId) return false;
      if (query.definitionId && instance.definitionId !== query.definitionId)
        return false;
      if (query.status && instance.status !== query.status) return false;
      if (query.startedBy && instance.startedBy !== query.startedBy)
        return false;
      return true;
    });

    const total = items.length;
    const start = (query.page - 1) * query.limit;
    items = items.slice(start, start + query.limit);

    return { items, total };
  }

  async save(instance: ProcessInstance): Promise<void> {
    this.store.set(instance.id.toString(), instance);
  }
}
