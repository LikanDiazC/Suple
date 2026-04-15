import { ValueObject, Result } from '../../../../shared/kernel';

interface MaterialSkuProps { value: string; }

/**
 * Stock Keeping Unit for a material.
 * Format: 3-32 uppercase alphanumeric + hyphens/underscores.
 * Example: "MDF-18MM", "PLY-15MM-PINE", "MDO-12MM"
 */
export class MaterialSku extends ValueObject<MaterialSkuProps> {
  private static readonly PATTERN = /^[A-Z0-9][A-Z0-9\-_]{2,31}$/;

  static create(raw: string): Result<MaterialSku> {
    const normalized = raw.trim().toUpperCase();
    if (!MaterialSku.PATTERN.test(normalized))
      return Result.fail(
        `Invalid SKU "${raw}". Must be 3-32 uppercase alphanumeric chars (hyphens/underscores allowed).`,
      );
    return Result.ok(new MaterialSku({ value: normalized }));
  }

  get value(): string { return this.props.value; }
  toString(): string  { return this.props.value; }
}
