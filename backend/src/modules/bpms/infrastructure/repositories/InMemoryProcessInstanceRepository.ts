import { Injectable } from '@nestjs/common';
import { ProcessInstance } from '../../domain/entities/ProcessInstance';
import {
  IProcessInstanceRepository,
  ProcessInstanceQuery,
} from '../../domain/repositories/IProcessInstanceRepository';
import { BaseInMemoryRepository } from '../../../../shared/infrastructure/BaseInMemoryRepository';

@Injectable()
export class InMemoryProcessInstanceRepository
  extends BaseInMemoryRepository<ProcessInstance>
  implements IProcessInstanceRepository
{
  async list(
    query: ProcessInstanceQuery,
  ): Promise<{ items: ProcessInstance[]; total: number }> {
    const filtered = this.allForTenant(query.tenantId).filter((inst) => {
      if (query.definitionId && inst.definitionId !== query.definitionId) return false;
      if (query.status && inst.status !== query.status) return false;
      if (query.startedBy && inst.startedBy !== query.startedBy) return false;
      return true;
    });

    return this.paginate(filtered, query.page, query.limit);
  }
}
