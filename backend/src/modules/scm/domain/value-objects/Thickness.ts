import { ValueObject, Result } from '../../../../shared/kernel';

interface ThicknessProps { mm: number; }

/** Standard Chilean/Latin American panel thicknesses (mm). */
const STANDARD_MDF_MM = [3, 5.5, 9, 12, 15, 18, 22, 25] as const;

export class Thickness extends ValueObject<ThicknessProps> {
  static create(mm: number): Result<Thickness> {
    if (!Number.isFinite(mm) || mm <= 0)
      return Result.fail(`Thickness must be a positive finite number (got ${mm})`);
    if (mm > 100)
      return Result.fail('Thickness exceeds maximum allowed (100mm)');
    return Result.ok(new Thickness({ mm }));
  }

  get mm(): number { return this.props.mm; }

  isStandardMdf(): boolean {
    return (STANDARD_MDF_MM as readonly number[]).includes(this.props.mm);
  }

  toString(): string { return `${this.props.mm}mm`; }
}
