import { Injectable } from '@nestjs/common';
import { ProcessDefinition } from '../../domain/entities/ProcessDefinition';
import {
  IProcessDefinitionRepository,
  ProcessDefinitionQuery,
} from '../../domain/repositories/IProcessDefinitionRepository';
import { BaseInMemoryRepository } from '../../../../shared/infrastructure/BaseInMemoryRepository';

@Injectable()
export class InMemoryProcessDefinitionRepository
  extends BaseInMemoryRepository<ProcessDefinition>
  implements IProcessDefinitionRepository
{
  async findByIdAnyTenant(id: string): Promise<ProcessDefinition | null> {
    return this.store.get(id) ?? null;
  }

  async list(
    query: ProcessDefinitionQuery,
  ): Promise<{ items: ProcessDefinition[]; total: number }> {
    const filtered = this.allForTenant(query.tenantId).filter((d) => {
      if (query.status && d.status !== query.status) return false;
      if (query.category && d.category !== query.category) return false;
      return true;
    });

    return this.paginate(filtered, query.page, query.limit);
  }
}
