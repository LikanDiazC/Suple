import { ValueObject } from '../../../../shared/kernel';

export enum TransitionConditionOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  CONTAINS = 'CONTAINS',
  IN = 'IN',
  IS_TRUE = 'IS_TRUE',
  IS_FALSE = 'IS_FALSE',
}

export interface TransitionCondition {
  field: string;
  operator: TransitionConditionOperator;
  value: unknown;
}

interface TransitionProps {
  fromNodeId: string;
  toNodeId: string;
  conditions: TransitionCondition[];
  priority: number; // Lower = higher priority (evaluated first)
  isDefault: boolean;
}

export class Transition extends ValueObject<TransitionProps> {
  private constructor(props: TransitionProps) {
    super(props);
  }

  static create(
    fromNodeId: string,
    toNodeId: string,
    conditions: TransitionCondition[],
    priority: number = 0,
    isDefault: boolean = false,
  ): Transition {
    return new Transition({ fromNodeId, toNodeId, conditions, priority, isDefault });
  }

  get fromNodeId(): string { return this.props.fromNodeId; }
  get toNodeId(): string { return this.props.toNodeId; }
  get conditions(): TransitionCondition[] { return this.props.conditions; }
  get priority(): number { return this.props.priority; }
  get isDefault(): boolean { return this.props.isDefault; }
}
