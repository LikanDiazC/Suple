import { AggregateRoot, UniqueId, Result } from '../../../../shared/kernel';
import { Dimensions } from '../value-objects/Dimensions';
import { Thickness } from '../value-objects/Thickness';
import { MaterialSku } from '../value-objects/MaterialSku';

/** Minimum size for a retazo to be worth tracking (100x100mm). */
const MIN_OFFCUT_AREA_MM2 = 100 * 100;

export enum OffcutStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED  = 'RESERVED',
  CONSUMED  = 'CONSUMED',
  DISCARDED = 'DISCARDED', // demasiado pequeño para un uso futuro
}

interface OffcutProps {
  materialSku:       MaterialSku;
  thickness:         Thickness;
  dimensions:        Dimensions;
  status:            OffcutStatus;
  sourceBoardId:     string;         // trazabilidad: qué plancha lo originó
  sourceWorkOrderId: string;         // trazabilidad: qué OT generó el retazo
  location:          string | null;
  createdAt:         Date;
  updatedAt:         Date;
  reservedByWorkOrderId: string | null;
}

/**
 * Offcut (Retazo) — Aggregate Root.
 *
 * Pieza útil que sobra tras un corte y se re-ingresa al inventario.
 * Cercha's key feature: instead of wasting leftover wood, these pieces
 * are tracked with exact dimensions and offered as inputs to future cutting jobs.
 *
 * The cutting engine receives offcuts alongside full boards,
 * and may prefer a retazo if it fits a required piece — maximizing material usage.
 *
 * Factory validates minimum size to avoid tracking dust.
 */
export class Offcut extends AggregateRoot<OffcutProps> {

  static create(
    tenantId: string,
    raw: {
      materialSku:       MaterialSku;
      thickness:         Thickness;
      dimensions:        Dimensions;
      sourceBoardId:     string;
      sourceWorkOrderId: string;
      location?:         string;
    },
  ): Result<Offcut> {
    if (raw.dimensions.areaMm2 < MIN_OFFCUT_AREA_MM2)
      return Result.fail(
        `Offcut too small to track (${raw.dimensions} = ${raw.dimensions.areaMm2}mm². Min: ${MIN_OFFCUT_AREA_MM2}mm²)`,
      );
    if (!raw.sourceBoardId.trim())
      return Result.fail('sourceBoardId is required for traceability');

    const now = new Date();
    return Result.ok(
      new Offcut(UniqueId.create(), tenantId, {
        materialSku:            raw.materialSku,
        thickness:              raw.thickness,
        dimensions:             raw.dimensions,
        status:                 OffcutStatus.AVAILABLE,
        sourceBoardId:          raw.sourceBoardId,
        sourceWorkOrderId:      raw.sourceWorkOrderId,
        location:               raw.location ?? null,
        createdAt:              now,
        updatedAt:              now,
        reservedByWorkOrderId:  null,
      }),
    );
  }

  static reconstitute(id: string, tenantId: string, props: OffcutProps): Offcut {
    return new Offcut(UniqueId.from(id), tenantId, props);
  }

  // ── Getters ──────────────────────────────────────────────────────────────────

  get materialSku():       MaterialSku  { return this.props.materialSku; }
  get thickness():         Thickness    { return this.props.thickness; }
  get dimensions():        Dimensions   { return this.props.dimensions; }
  get status():            OffcutStatus { return this.props.status; }
  get sourceBoardId():          string       { return this.props.sourceBoardId; }
  get sourceWorkOrderId():      string       { return this.props.sourceWorkOrderId; }
  get reservedByWorkOrderId():  string | null { return this.props.reservedByWorkOrderId; }
  get isAvailable():            boolean      { return this.props.status === OffcutStatus.AVAILABLE; }

  // ── State transitions (same lifecycle as Board) ───────────────────────────────

  reserve(workOrderId: string): Result<void> {
    if (!this.isAvailable)
      return Result.fail(`Offcut ${this.id} is not AVAILABLE (current: ${this.props.status})`);
    this.props.status                 = OffcutStatus.RESERVED;
    this.props.reservedByWorkOrderId  = workOrderId;
    this.props.updatedAt              = new Date();
    return Result.ok(undefined);
  }

  release(): Result<void> {
    if (this.props.status !== OffcutStatus.RESERVED)
      return Result.fail(`Offcut ${this.id} is not RESERVED`);
    this.props.status                 = OffcutStatus.AVAILABLE;
    this.props.reservedByWorkOrderId  = null;
    this.props.updatedAt              = new Date();
    return Result.ok(undefined);
  }

  consume(): Result<void> {
    if (this.props.status !== OffcutStatus.RESERVED)
      return Result.fail('Offcut must be RESERVED before consuming');
    this.props.status    = OffcutStatus.CONSUMED;
    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }
}
