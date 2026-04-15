import { ProcessDefinition, ProcessDefinitionStatus } from '../entities/ProcessDefinition';

export interface ProcessDefinitionQuery {
  tenantId: string;
  status?: ProcessDefinitionStatus;
  category?: string;
  page: number;
  limit: number;
}

export interface IProcessDefinitionRepository {
  findById(tenantId: string, id: string): Promise<ProcessDefinition | null>;
  findByIdAnyTenant(id: string): Promise<ProcessDefinition | null>; // for templates
  list(query: ProcessDefinitionQuery): Promise<{ items: ProcessDefinition[]; total: number }>;
  save(definition: ProcessDefinition): Promise<void>;
}

export const PROCESS_DEFINITION_REPOSITORY = Symbol('IProcessDefinitionRepository');
