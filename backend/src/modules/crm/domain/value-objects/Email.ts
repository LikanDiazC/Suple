import { ValueObject } from '../../../../shared/kernel';
import { Result } from '../../../../shared/kernel';

interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  private static readonly PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(props: EmailProps) {
    super(props);
  }

  static create(raw: string): Result<Email> {
    const normalized = raw.trim().toLowerCase();
    if (!this.PATTERN.test(normalized)) {
      return Result.fail(`Invalid email format: ${raw}`);
    }
    return Result.ok(new Email({ value: normalized }));
  }

  get value(): string {
    return this.props.value;
  }

  get domain(): string {
    return this.props.value.split('@')[1];
  }
}
