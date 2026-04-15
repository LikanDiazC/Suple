import { Task, TaskStatus } from '../entities/Task';

export interface TaskQuery {
  tenantId:        string;
  instanceId?:     string;
  assigneeUserId?: string;
  assigneeRole?:   string;
  status?:         TaskStatus | TaskStatus[];
  nodeId?:         string;
  page:            number;
  limit:           number;
}

export interface ITaskRepository {
  findById(tenantId: string, id: string): Promise<Task | null>;
  findByInstanceAndNode(tenantId: string, instanceId: string, nodeId: string): Promise<Task[]>;
  findOverdue(tenantId: string, before: Date): Promise<Task[]>;
  list(query: TaskQuery): Promise<{ items: Task[]; total: number }>;
  save(task: Task): Promise<void>;
  saveMany(tasks: Task[]): Promise<void>;
}

export const TASK_REPOSITORY = Symbol('ITaskRepository');
