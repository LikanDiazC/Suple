import { ValueObject, Result } from '../../../../shared/kernel';

interface DimensionsProps {
  widthMm: number;
  heightMm: number;
}

/**
 * Immutable 2D dimensions in millimetres.
 * Validated on construction — no invalid state possible.
 */
export class Dimensions extends ValueObject<DimensionsProps> {
  /** Max plancha standard MDF/plywood: 2800mm */
  private static readonly MAX_DIM_MM = 6000;

  static create(widthMm: number, heightMm: number): Result<Dimensions> {
    if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm))
      return Result.fail('Dimensions must be finite numbers');
    if (widthMm <= 0 || heightMm <= 0)
      return Result.fail(`Dimensions must be positive (got ${widthMm}x${heightMm})`);
    if (widthMm > Dimensions.MAX_DIM_MM || heightMm > Dimensions.MAX_DIM_MM)
      return Result.fail(`Dimensions exceed maximum allowed (${Dimensions.MAX_DIM_MM}mm)`);
    return Result.ok(new Dimensions({ widthMm, heightMm }));
  }

  get widthMm(): number  { return this.props.widthMm; }
  get heightMm(): number { return this.props.heightMm; }
  get areaMm2(): number  { return this.props.widthMm * this.props.heightMm; }

  /** Whether this surface can contain a piece with the given dimensions (ignores rotation). */
  canFit(piece: Dimensions): boolean {
    return this.props.widthMm >= piece.widthMm && this.props.heightMm >= piece.heightMm;
  }

  /** Whether this surface can contain a piece considering 90° rotation. */
  canFitRotated(piece: Dimensions): boolean {
    return this.canFit(piece) || this.canFit(piece.rotated());
  }

  /** Returns a 90°-rotated copy. */
  rotated(): Dimensions {
    return new Dimensions({ widthMm: this.props.heightMm, heightMm: this.props.widthMm });
  }

  toString(): string {
    return `${this.props.widthMm}x${this.props.heightMm}mm`;
  }
}
