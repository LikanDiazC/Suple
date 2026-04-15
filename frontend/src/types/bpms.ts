export type NodeType =
  | 'START_EVENT'
  | 'END_EVENT'
  | 'USER_TASK'
  | 'SERVICE_TASK'
  | 'EXCLUSIVE_GATEWAY'
  | 'PARALLEL_GATEWAY'
  | 'INCLUSIVE_GATEWAY'
  | 'TIMER_EVENT';

export type ProcessDefinitionStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED';
export type ProcessInstanceStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'SUSPENDED' | 'ERROR';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea' | 'date';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface NodeConfig {
  type: NodeType;
  assigneeUserId?: string;
  assigneeRole?: string;
  slaHours?: number;
  form?: FormField[];
  approvalOutcomes?: string[];
  description?: string;
  serviceType?: string;
  params?: Record<string, unknown>;
  durationHours?: number;
  escalateToUserId?: string;
}

export interface FlowNodeData {
  id: string;
  type: NodeType;
  name: string;
  position: { x: number; y: number };
  config: NodeConfig;
}

export interface TransitionCondition {
  field: string;
  operator:
    | 'EQUALS'
    | 'NOT_EQUALS'
    | 'GREATER_THAN'
    | 'LESS_THAN'
    | 'CONTAINS'
    | 'IN'
    | 'IS_TRUE'
    | 'IS_FALSE';
  value: unknown;
}

export interface TransitionData {
  fromNodeId: string;
  toNodeId: string;
  conditions: TransitionCondition[];
  priority: number;
  isDefault: boolean;
}

export interface ProcessDefinition {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  version: number;
  status: ProcessDefinitionStatus;
  category: string;
  icon?: string;
  createdBy: string;
  nodes: FlowNodeData[];
  transitions: TransitionData[];
  createdAt: string;
  updatedAt: string;
}

export interface ProcessInstance {
  id: string;
  tenantId: string;
  definitionId: string;
  definitionVersion: number;
  status: ProcessInstanceStatus;
  activeNodeIds: string[];
  completedNodeIds: string[];
  variables: Record<string, unknown>;
  startedBy: string;
  startedAt: string;
  completedAt: string | null;
  title: string;
  entityRef: { type: string; id: string } | null;
}

export interface Task {
  id: string;
  tenantId: string;
  instanceId: string;
  definitionId: string;
  nodeId: string;
  name: string;
  description: string;
  status: TaskStatus;
  assigneeUserId: string | null;
  assigneeRole: string | null;
  claimedBy: string | null;
  claimedAt: string | null;
  completedBy: string | null;
  completedAt: string | null;
  dueDate: string | null;
  outcome: string | null;
  form: FormField[];
  approvalOutcomes: string[];
  submission: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
}

export interface BpmsAnalytics {
  activeInstances: number;
  pendingTasks: number;
  overdueTasks: number;
  completedToday: number;
}
