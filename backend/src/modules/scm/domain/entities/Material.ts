import { AggregateRoot, UniqueId, Result } from '../../../../shared/kernel';
import { Dimensions } from '../value-objects/Dimensions';
import { Thickness } from '../value-objects/Thickness';
import { MaterialSku } from '../value-objects/MaterialSku';

export enum MaterialType {
  PANEL      = 'PANEL',       // MDF, aglomerado, terciado
  SOLID_WOOD = 'SOLID_WOOD',
  LAMINATE   = 'LAMINATE',
  HARDWARE   = 'HARDWARE',    // bisagras, correderas, etc. — no sujeto a corte
}

interface MaterialProps {
  sku:                MaterialSku;
  name:               string;
  type:               MaterialType;
  thickness:          Thickness;
  standardDimensions: Dimensions;  // dimensiones estándar de una plancha completa
  pricePerBoard:      number;       // CLP por plancha
  isActive:           boolean;
  createdAt:          Date;
  updatedAt:          Date;
}

export class Material extends AggregateRoot<MaterialProps> {

  // ── Factory ──────────────────────────────────────────────────────────────────

  static create(
    tenantId: string,
    raw: {
      sku:                MaterialSku;
      name:               string;
      type:               MaterialType;
      thickness:          Thickness;
      standardDimensions: Dimensions;
      pricePerBoard:      number;
    },
  ): Result<Material> {
    if (!raw.name.trim())       return Result.fail('Material name is required');
    if (raw.pricePerBoard < 0)  return Result.fail('pricePerBoard cannot be negative');
    if (raw.type === MaterialType.HARDWARE && raw.standardDimensions.areaMm2 > 0) {
      // Hardware items don't have sheet dimensions — accept but note it's unusual
    }

    const now = new Date();
    return Result.ok(
      new Material(UniqueId.create(), tenantId, {
        ...raw,
        isActive:  true,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  /** Reconstitute from persistence (no validation needed — data already trusted). */
  static reconstitute(id: string, tenantId: string, props: MaterialProps): Material {
    return new Material(UniqueId.from(id), tenantId, props);
  }

  // ── Getters ──────────────────────────────────────────────────────────────────

  get sku():                MaterialSku  { return this.props.sku; }
  get name():               string       { return this.props.name; }
  get type():               MaterialType { return this.props.type; }
  get thickness():          Thickness    { return this.props.thickness; }
  get standardDimensions(): Dimensions   { return this.props.standardDimensions; }
  get pricePerBoard():      number       { return this.props.pricePerBoard; }
  get isActive():           boolean      { return this.props.isActive; }
  get createdAt():          Date         { return this.props.createdAt; }
  get updatedAt():          Date         { return this.props.updatedAt; }

  /** True if this material can be used in 2D cutting optimization. */
  get isCuttable(): boolean {
    return this.props.type === MaterialType.PANEL || this.props.type === MaterialType.SOLID_WOOD;
  }

  // ── State transitions ────────────────────────────────────────────────────────

  deactivate(): void {
    this.props.isActive  = false;
    this.props.updatedAt = new Date();
  }

  updatePrice(newPrice: number): Result<void> {
    if (newPrice < 0) return Result.fail('Price cannot be negative');
    this.props.pricePerBoard = newPrice;
    this.props.updatedAt     = new Date();
    return Result.ok(undefined);
  }
}
