import { ValueObject, Result } from '../../../../shared/kernel';

interface MoneyProps {
  amount: number;   // Stored as integer cents to avoid floating-point errors
  currency: string; // ISO 4217 (e.g., "USD", "EUR", "MXN")
}

/**
 * Immutable value object for monetary amounts.
 * Internally stores amounts as integer minor units (cents)
 * to prevent floating-point arithmetic errors in financial calculations.
 */
export class Money extends ValueObject<MoneyProps> {
  private static readonly VALID_CURRENCIES = new Set([
    'USD', 'EUR', 'GBP', 'MXN', 'BRL', 'CAD', 'JPY', 'CNY', 'CHF', 'AUD',
  ]);

  private constructor(props: MoneyProps) {
    super(props);
  }

  static fromCents(cents: number, currency: string): Result<Money> {
    if (!Number.isInteger(cents)) {
      return Result.fail('Amount in cents must be an integer');
    }
    const cur = currency.toUpperCase();
    if (!this.VALID_CURRENCIES.has(cur)) {
      return Result.fail(`Unsupported currency: ${currency}`);
    }
    return Result.ok(new Money({ amount: cents, currency: cur }));
  }

  static fromDecimal(amount: number, currency: string): Result<Money> {
    const cents = Math.round(amount * 100);
    return Money.fromCents(cents, currency);
  }

  static zero(currency: string): Money {
    return new Money({ amount: 0, currency: currency.toUpperCase() });
  }

  add(other: Money): Result<Money> {
    if (this.props.currency !== other.props.currency) {
      return Result.fail(
        `Cannot add ${this.props.currency} and ${other.props.currency}`,
      );
    }
    return Money.fromCents(
      this.props.amount + other.props.amount,
      this.props.currency,
    );
  }

  subtract(other: Money): Result<Money> {
    if (this.props.currency !== other.props.currency) {
      return Result.fail(
        `Cannot subtract ${other.props.currency} from ${this.props.currency}`,
      );
    }
    return Money.fromCents(
      this.props.amount - other.props.amount,
      this.props.currency,
    );
  }

  get cents(): number { return this.props.amount; }
  get decimal(): number { return this.props.amount / 100; }
  get currency(): string { return this.props.currency; }
  get isDebit(): boolean { return this.props.amount > 0; }
  get isCredit(): boolean { return this.props.amount < 0; }
}
