import { ValueObject, Result } from '../../../../shared/kernel';

interface TenantIdProps {
  value: string;
}

/**
 * Strongly-typed Tenant identifier.
 * Ensures tenant isolation is enforced at the domain level,
 * not just at the infrastructure/query level.
 */
export class TenantId extends ValueObject<TenantIdProps> {
  private static readonly PATTERN = /^tnt_[a-zA-Z0-9]{8,64}$/;

  private constructor(props: TenantIdProps) {
    super(props);
  }

  static create(raw: string): Result<TenantId> {
    if (!raw || !this.PATTERN.test(raw)) {
      return Result.fail(
        `Invalid TenantId format: "${raw}". Expected pattern: tnt_<alphanumeric 8-64>.`,
      );
    }
    return Result.ok(new TenantId({ value: raw }));
  }

  get value(): string {
    return this.props.value;
  }
}
