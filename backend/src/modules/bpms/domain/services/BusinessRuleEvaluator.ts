import {
  TransitionCondition,
  TransitionConditionOperator,
} from '../value-objects/Transition';

/**
 * ==========================================================================
 * Business Rule Evaluator
 * ==========================================================================
 *
 * Stateless evaluator for BPMN transition conditions.
 * Receives a set of conditions and a process context (variables map),
 * and determines whether all conditions are satisfied.
 *
 * Supports a typed operator set that covers common business rules:
 *   - Equality / inequality comparisons
 *   - Numeric thresholds (amount > 10000)
 *   - String containment (status CONTAINS "approved")
 *   - Set membership (region IN ["NA", "EU"])
 *   - Boolean flags (isUrgent IS_TRUE)
 * ==========================================================================
 */
export class BusinessRuleEvaluator {
  /**
   * Evaluates ALL conditions against the provided context.
   * Returns true only if every condition is satisfied (AND logic).
   * For OR logic, model multiple transitions from the same node.
   */
  evaluate(
    conditions: TransitionCondition[],
    context: Record<string, unknown>,
  ): boolean {
    if (conditions.length === 0) return true;

    return conditions.every((condition) =>
      this.evaluateCondition(condition, context),
    );
  }

  private evaluateCondition(
    condition: TransitionCondition,
    context: Record<string, unknown>,
  ): boolean {
    const actual = this.resolveField(condition.field, context);

    switch (condition.operator) {
      case TransitionConditionOperator.EQUALS:
        return actual === condition.value;

      case TransitionConditionOperator.NOT_EQUALS:
        return actual !== condition.value;

      case TransitionConditionOperator.GREATER_THAN:
        return (
          typeof actual === 'number' &&
          typeof condition.value === 'number' &&
          actual > condition.value
        );

      case TransitionConditionOperator.LESS_THAN:
        return (
          typeof actual === 'number' &&
          typeof condition.value === 'number' &&
          actual < condition.value
        );

      case TransitionConditionOperator.CONTAINS:
        return (
          typeof actual === 'string' &&
          typeof condition.value === 'string' &&
          actual.includes(condition.value)
        );

      case TransitionConditionOperator.IN:
        return Array.isArray(condition.value) && condition.value.includes(actual);

      case TransitionConditionOperator.IS_TRUE:
        return actual === true;

      case TransitionConditionOperator.IS_FALSE:
        return actual === false;

      default:
        return false;
    }
  }

  /**
   * Resolves dot-notation field paths against the context.
   * Example: "order.total" resolves context.order.total
   */
  private resolveField(
    fieldPath: string,
    context: Record<string, unknown>,
  ): unknown {
    const segments = fieldPath.split('.');
    let current: unknown = context;

    for (const segment of segments) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[segment];
    }

    return current;
  }
}
