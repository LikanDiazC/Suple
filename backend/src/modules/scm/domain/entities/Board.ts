import { AggregateRoot, UniqueId, Result } from '../../../../shared/kernel';
import { Dimensions } from '../value-objects/Dimensions';
import { Thickness } from '../value-objects/Thickness';
import { MaterialSku } from '../value-objects/MaterialSku';

export enum BoardStatus {
  AVAILABLE = 'AVAILABLE',  // en bodega, libre para usar
  RESERVED  = 'RESERVED',   // asignada a una WorkOrder activa
  CONSUMED  = 'CONSUMED',   // usada completamente
  SCRAPPED  = 'SCRAPPED',   // descartada (daño físico, humedad, etc.)
}

interface BoardProps {
  materialSku:  MaterialSku;
  thickness:    Thickness;
  dimensions:   Dimensions;
  status:       BoardStatus;
  location:     string | null;     // ej. "Bodega A / Rack 3 / Posición 2"
  batchCode:    string | null;     // código de lote del proveedor
  receivedAt:   Date;
  updatedAt:    Date;
  reservedByWorkOrderId: string | null;  // trazabilidad
}

/**
 * Board (Plancha) — Aggregate Root.
 *
 * Represents a single physical sheet of material in stock.
 * The unit of purchase (una plancha 2440x1220) que se convierte
 * en múltiples piezas mediante el motor de corte.
 *
 * Invariant: un Board AVAILABLE nunca tiene reservedByWorkOrderId.
 * Invariant: un Board CONSUMED/SCRAPPED es inmutable.
 */
export class Board extends AggregateRoot<BoardProps> {

  static create(
    tenantId: string,
    raw: {
      materialSku: MaterialSku;
      thickness:   Thickness;
      dimensions:  Dimensions;
      location?:   string;
      batchCode?:  string;
    },
  ): Result<Board> {
    return Result.ok(
      new Board(UniqueId.create(), tenantId, {
        materialSku:            raw.materialSku,
        thickness:              raw.thickness,
        dimensions:             raw.dimensions,
        status:                 BoardStatus.AVAILABLE,
        location:               raw.location ?? null,
        batchCode:              raw.batchCode ?? null,
        receivedAt:             new Date(),
        updatedAt:              new Date(),
        reservedByWorkOrderId:  null,
      }),
    );
  }

  static reconstitute(id: string, tenantId: string, props: BoardProps): Board {
    return new Board(UniqueId.from(id), tenantId, props);
  }

  // ── Getters ──────────────────────────────────────────────────────────────────

  get materialSku():  MaterialSku { return this.props.materialSku; }
  get thickness():    Thickness   { return this.props.thickness; }
  get dimensions():   Dimensions  { return this.props.dimensions; }
  get status():       BoardStatus { return this.props.status; }
  get location():     string | null { return this.props.location; }
  get batchCode():    string | null { return this.props.batchCode; }
  get receivedAt():   Date { return this.props.receivedAt; }
  get isAvailable():  boolean { return this.props.status === BoardStatus.AVAILABLE; }
  get reservedByWorkOrderId(): string | null { return this.props.reservedByWorkOrderId; }

  // ── State transitions ────────────────────────────────────────────────────────

  reserve(workOrderId: string): Result<void> {
    if (this.props.status !== BoardStatus.AVAILABLE)
      return Result.fail(`Board ${this.id.toString()} is not AVAILABLE (current: ${this.props.status})`);
    this.props.status                 = BoardStatus.RESERVED;
    this.props.reservedByWorkOrderId  = workOrderId;
    this.props.updatedAt              = new Date();
    return Result.ok(undefined);
  }

  release(): Result<void> {
    if (this.props.status !== BoardStatus.RESERVED)
      return Result.fail(`Board ${this.id.toString()} is not RESERVED`);
    this.props.status                 = BoardStatus.AVAILABLE;
    this.props.reservedByWorkOrderId  = null;
    this.props.updatedAt              = new Date();
    return Result.ok(undefined);
  }

  consume(): Result<void> {
    if (this.props.status !== BoardStatus.RESERVED)
      return Result.fail(`Board ${this.id.toString()} must be RESERVED before consuming`);
    this.props.status    = BoardStatus.CONSUMED;
    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }

  scrap(reason?: string): Result<void> {
    if (this.props.status === BoardStatus.CONSUMED)
      return Result.fail('Cannot scrap an already consumed board');
    this.props.status    = BoardStatus.SCRAPPED;
    this.props.updatedAt = new Date();
    void reason; // future: store in event payload
    return Result.ok(undefined);
  }
}
