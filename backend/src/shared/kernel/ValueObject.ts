/**
 * Base class for Value Objects in the domain model.
 * Value Objects are immutable and compared by structural equality
 * (i.e., two VOs with the same properties are considered equal).
 *
 * Examples: Money, Email, PhoneNumber, AccountCode, TenantId.
 */
export abstract class ValueObject<TProps> {
  protected readonly props: TProps;

  protected constructor(props: TProps) {
    this.props = Object.freeze(props);
  }

  equals(other: ValueObject<TProps>): boolean {
    if (!other) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
