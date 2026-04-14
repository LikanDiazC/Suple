import { ValueObject } from '../../../../shared/kernel';
import { Result } from '../../../../shared/kernel';

interface PhoneNumberProps {
  countryCode: string;
  number: string;
}

export class PhoneNumber extends ValueObject<PhoneNumberProps> {
  private constructor(props: PhoneNumberProps) {
    super(props);
  }

  static create(countryCode: string, number: string): Result<PhoneNumber> {
    const sanitized = number.replace(/[\s\-\(\)\.]/g, '');
    if (!/^\d{7,15}$/.test(sanitized)) {
      return Result.fail(`Invalid phone number: ${number}`);
    }
    const code = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
    return Result.ok(new PhoneNumber({ countryCode: code, number: sanitized }));
  }

  get canonical(): string {
    return `${this.props.countryCode}${this.props.number}`;
  }
}
