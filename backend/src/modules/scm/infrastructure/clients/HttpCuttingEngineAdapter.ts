import { Injectable, Logger } from '@nestjs/common';
import { Result } from '../../../../shared/kernel';
import {
  ICuttingEnginePort,
  CuttingRequest,
} from '../../domain/ports/ICuttingEnginePort';
import {
  CuttingPlan,
  BoardAllocation,
  PiecePlacement,
  PlannedOffcut,
} from '../../domain/entities/WorkOrder';

// ── Python API contract (wire format) ────────────────────────────────────────
// These mirror the Python microservice's Pydantic models exactly.

interface PyBoardInput {
  id:       string;
  width_mm: number;
  height_mm: number;
  is_offcut: boolean;
}

interface PyPieceInput {
  id:        string;
  width_mm:  number;
  height_mm: number;
  quantity:  number;
  label:     string;
  can_rotate: boolean;
}

interface PyOptimizeRequest {
  job_id:        string;
  stocks:        PyBoardInput[];
  pieces:        PyPieceInput[];
  kerf_mm:       number;
  allow_rotation: boolean;
}

interface PyPlacement {
  piece_id:  string;
  x:         number;
  y:         number;
  width_mm:  number;
  height_mm: number;
  rotated:   boolean;
}

interface PyOffcut {
  width_mm:  number;
  height_mm: number;
  x:         number;
  y:         number;
}

interface PyBoardAllocation {
  board_id:   string;
  is_offcut:  boolean;
  placements: PyPlacement[];
  offcuts:    PyOffcut[];
}

interface PyOptimizeResponse {
  success:            boolean;
  efficiency_percent: number;
  board_allocations:  PyBoardAllocation[];
  svg_layout:         string;
  unplaced_piece_ids: string[];
  error?:             string;
}

// ── Adapter ──────────────────────────────────────────────────────────────────

@Injectable()
export class HttpCuttingEngineAdapter implements ICuttingEnginePort {
  private readonly logger  = new Logger(HttpCuttingEngineAdapter.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    this.baseUrl   = process.env.CUTTING_ENGINE_URL   ?? 'http://localhost:8000';
    this.timeoutMs = parseInt(process.env.CUTTING_ENGINE_TIMEOUT_MS ?? '30000', 10);
  }

  // ── ICuttingEnginePort ───────────────────────────────────────────────────────

  async optimize(request: CuttingRequest): Promise<Result<CuttingPlan>> {
    const pyRequest = this.toWireFormat(request);

    this.logger.log(
      `[CuttingEngine] Sending job ${request.jobId}: ` +
      `${request.stocks.length} stocks, ${request.pieces.length} piece types`,
    );

    try {
      const response = await this.post<PyOptimizeResponse>('/optimize', pyRequest);

      if (!response.success) {
        const reason = response.error ?? 'Engine returned success=false with no reason';
        this.logger.warn(`[CuttingEngine] Job ${request.jobId} failed: ${reason}`);
        return Result.fail(reason);
      }

      if (response.unplaced_piece_ids.length > 0) {
        return Result.fail(
          `Cutting engine could not place ${response.unplaced_piece_ids.length} piece(s): ` +
          response.unplaced_piece_ids.join(', ') +
          '. Add more stock or reduce requirements.',
        );
      }

      const plan = this.toDomain(response);
      this.logger.log(
        `[CuttingEngine] Job ${request.jobId} completed — ` +
        `efficiency: ${plan.efficiencyPercent.toFixed(1)}%, ` +
        `boards used: ${plan.boardAllocations.length}`,
      );

      return Result.ok(plan);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[CuttingEngine] HTTP error for job ${request.jobId}: ${message}`);
      return Result.fail(`Cutting engine unavailable: ${message}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      const res   = await fetch(`${this.baseUrl}/health`, { signal: ctrl.signal });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── Mapping: Domain → Wire ────────────────────────────────────────────────

  private toWireFormat(req: CuttingRequest): PyOptimizeRequest {
    return {
      job_id:         req.jobId,
      kerf_mm:        req.kerfMm,
      allow_rotation: req.allowRotation,
      stocks: req.stocks.map(s => ({
        id:        s.id,
        width_mm:  s.widthMm,
        height_mm: s.heightMm,
        is_offcut: s.isOffcut,
      })),
      pieces: req.pieces.map(p => ({
        id:         p.id,
        width_mm:   p.widthMm,
        height_mm:  p.heightMm,
        quantity:   p.quantity,
        label:      p.label,
        can_rotate: p.canRotate,
      })),
    };
  }

  // ── Mapping: Wire → Domain ────────────────────────────────────────────────

  private toDomain(res: PyOptimizeResponse): CuttingPlan {
    const boardAllocations: BoardAllocation[] = res.board_allocations.map(b => ({
      boardId:  b.board_id,
      isOffcut: b.is_offcut,
      placements: b.placements.map((p): PiecePlacement => ({
        requirementId: p.piece_id,
        x:             p.x,
        y:             p.y,
        widthMm:       p.width_mm,
        heightMm:      p.height_mm,
        rotated:       p.rotated,
      })),
      offcuts: b.offcuts.map((o): PlannedOffcut => ({
        widthMm:  o.width_mm,
        heightMm: o.height_mm,
        x:        o.x,
        y:        o.y,
      })),
    }));

    return {
      efficiencyPercent: res.efficiency_percent,
      boardAllocations,
      svgLayout:         res.svg_layout,
      unplacedPieceIds:  res.unplaced_piece_ids,
      computedAt:        new Date(),
    };
  }

  // ── HTTP helper ────────────────────────────────────────────────────────────

  private async post<T>(path: string, body: unknown): Promise<T> {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  ctrl.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      return res.json() as Promise<T>;
    } finally {
      clearTimeout(timer);
    }
  }
}
