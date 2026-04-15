import { ValueObject } from '../../../../shared/kernel';
import { NodeType, ProcessNode } from '../services/DAGExecutionEngine';

// Form field for UserTask forms
export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea' | 'date';
  required: boolean;
  options?: string[]; // for 'select' type
  placeholder?: string;
}

// Per-node configuration, discriminated by NodeType
export type NodeConfig =
  | { type: NodeType.USER_TASK; assigneeUserId?: string; assigneeRole?: string; slaHours?: number; form?: FormField[]; approvalOutcomes?: string[]; description?: string; }
  | { type: NodeType.SERVICE_TASK; serviceType: 'SCM_OPTIMIZE' | 'SEND_EMAIL' | 'WEBHOOK' | 'SCM_CREATE_WORK_ORDER'; params?: Record<string, unknown>; }
  | { type: NodeType.TIMER_EVENT; durationHours: number; escalateToUserId?: string; }
  | { type: NodeType.EXCLUSIVE_GATEWAY | NodeType.PARALLEL_GATEWAY | NodeType.INCLUSIVE_GATEWAY; }
  | { type: NodeType.START_EVENT | NodeType.END_EVENT; };

interface FlowNodeProps {
  id: string;
  type: NodeType;
  name: string;
  position: { x: number; y: number };
  config: NodeConfig;
}

export class FlowNode extends ValueObject<FlowNodeProps> {
  private constructor(props: FlowNodeProps) {
    super(props);
  }

  static create(
    id: string,
    type: NodeType,
    name: string,
    position: { x: number; y: number },
    config: NodeConfig,
  ): FlowNode {
    return new FlowNode({ id, type, name, position, config });
  }

  get id(): string { return this.props.id; }
  get type(): NodeType { return this.props.type; }
  get name(): string { return this.props.name; }
  get position(): { x: number; y: number } { return this.props.position; }
  get config(): NodeConfig { return this.props.config; }

  toProcessNode(): ProcessNode {
    return {
      id: this.props.id,
      type: this.props.type,
      name: this.props.name,
      metadata: this.props.config as Record<string, unknown>,
    };
  }
}
