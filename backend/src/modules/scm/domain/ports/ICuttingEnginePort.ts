import { Result } from '../../../../shared/kernel';
import { CuttingPlan } from '../entities/WorkOrder';

// ── Request ───────────────────────────────────────────────────────────────────

export interface CuttingStock {
  id:         string;      // Board.id or Offcut.id
  isOffcut:   boolean;
  widthMm:    number;
  heightMm:   number;
}

export interface CuttingPiece {
  id:          string;     // CuttingRequirement.id
  widthMm:     number;
  heightMm:    number;
  quantity:    number;
  label:       string;
  canRotate:   boolean;
}

export interface CuttingRequest {
  jobId:        string;       // WorkOrder.id — correlación (idempotencia)
  stocks:       CuttingStock[];
  pieces:       CuttingPiece[];
  kerfMm:       number;       // grosor de la sierra (default 3mm)
  allowRotation: boolean;
}

// ── Response ──────────────────────────────────────────────────────────────────

/**
 * ICuttingEnginePort — Domain Port (hexagonal).
 *
 * Design decision: **synchronous HTTP** (not Kafka).
 *
 * Rationale:
 *   - Bin-packing 2D is a bounded computation (seconds, not minutes).
 *   - The caller needs the result immediately to display the SVG cut-plan in the UI.
 *   - No side effects in Python — pure function: input → output.
 *   - Kafka would require a correlation ID + response-topic + polling, adding
 *     complexity without benefit for a sub-10s computation.
 *
 * The *downstream* effects (inventory deduction, offcut registration) DO use
 * Kafka events — because those are async cross-module concerns.
 */
export interface ICuttingEnginePort {
  /**
   * Sends a cutting optimization request to the Python microservice and
   * returns the complete CuttingPlan synchronously.
   *
   * Returns Result.fail() for:
   *   - Python service unavailable (network error)
   *   - Validation errors in the request
   *   - Pieces that cannot be placed in any available stock
   */
  optimize(request: CuttingRequest): Promise<Result<CuttingPlan>>;

  /** Health check for the Python microservice. */
  isHealthy(): Promise<boolean>;
}

export const CUTTING_ENGINE_PORT = Symbol('ICuttingEnginePort');
