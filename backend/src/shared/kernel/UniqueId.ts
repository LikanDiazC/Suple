import { randomUUID } from 'crypto';

/**
 * Value Object representing a domain-wide unique identifier.
 * Encapsulates UUID generation to decouple domain entities from
 * infrastructure-specific ID strategies (e.g., database sequences).
 */
export class UniqueId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(): UniqueId {
    return new UniqueId(randomUUID());
  }

  static from(value: string): UniqueId {
    if (!value || value.trim().length === 0) {
      throw new Error('UniqueId cannot be empty');
    }
    return new UniqueId(value);
  }

  equals(other: UniqueId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
