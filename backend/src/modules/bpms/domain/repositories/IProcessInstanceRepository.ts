import { ProcessInstance, ProcessInstanceStatus } from '../entities/ProcessInstance';

export interface ProcessInstanceQuery {
  tenantId:      string;
  definitionId?: string;
  status?:       ProcessInstanceStatus;
  startedBy?:    string;
  page:          number;
  limit:         number;
}

export interface IProcessInstanceRepository {
  findById(tenantId: string, id: string): Promise<ProcessInstance | null>;
  list(query: ProcessInstanceQuery): Promise<{ items: ProcessInstance[]; total: number }>;
  save(instance: ProcessInstance): Promise<void>;
}

export const PROCESS_INSTANCE_REPOSITORY = Symbol('IProcessInstanceRepository');
