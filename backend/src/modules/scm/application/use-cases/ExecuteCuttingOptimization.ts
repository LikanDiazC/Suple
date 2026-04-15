import { Injectable, Inject, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Result } from '../../../../shared/kernel';
import { EventBus } from '../../../../infrastructure/messaging/events/EventBus';
import { WorkOrder, WorkOrderStatus } from '../../domain/entities/WorkOrder';
import { Board } from '../../domain/entities/Board';
import { Offcut } from '../../domain/entities/Offcut';
import {
  IWorkOrderRepository,
  WORK_ORDER_REPOSITORY,
} from '../../domain/repositories/IWorkOrderRepository';
import {
  IBoardRepository,
  BOARD_REPOSITORY,
} from '../../domain/repositories/IBoardRepository';
import {
  IOffcutRepository,
  OFFCUT_REPOSITORY,
} from '../../domain/repositories/IOffcutRepository';
import {
  ICuttingEnginePort,
  CUTTING_ENGINE_PORT,
  CuttingRequest,
  CuttingStock,
  CuttingPiece,
} from '../../domain/ports/ICuttingEnginePort';

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface ExecuteCuttingOptimizationCommand {
  tenantId:     string;
  workOrderId:  string;
  kerfMm?:      number;     // default: 3mm (standard table saw)
  allowRotation?: boolean;  // default: true
}

export interface ExecuteCuttingOptimizationResult {
  workOrderId:       string;
  efficiencyPercent: number;
  boardsUsed:        number;
  offcutsToCreate:   number;
  svgLayout:         string;
}

// ── Use Case ──────────────────────────────────────────────────────────────────

/**
 * ExecuteCuttingOptimizationUseCase
 *
 * Orchestrates the full MRP cutting workflow:
 *
 *   1. Load WorkOrder (must be PENDING)
 *   2. Query available Boards + Offcuts from inventory
 *      (Offcuts are prioritized by size — smallest that fits first, to avoid
 *       using a large board when a retazo suffices)
 *   3. Build CuttingRequest and call Python engine via ICuttingEnginePort
 *   4. If optimization succeeds:
 *      a. Reserve the boards/offcuts used in the plan
 *      b. Attach CuttingPlan to WorkOrder → emits CuttingOptimizationCompletedEvent
 *      c. Save WorkOrder (EventBus flushes events → Kafka)
 *   5. Return result DTO to controller
 *
 * Idempotency: If workOrder.status is already OPTIMIZING (engine was called
 * before but response lost), we return the existing plan without calling Python again.
 */
@Injectable()
export class ExecuteCuttingOptimizationUseCase {
  private readonly logger = new Logger(ExecuteCuttingOptimizationUseCase.name);

  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly workOrderRepo:  IWorkOrderRepository,
    @Inject(BOARD_REPOSITORY)      private readonly boardRepo:       IBoardRepository,
    @Inject(OFFCUT_REPOSITORY)     private readonly offcutRepo:      IOffcutRepository,
    @Inject(CUTTING_ENGINE_PORT)   private readonly cuttingEngine:   ICuttingEnginePort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(cmd: ExecuteCuttingOptimizationCommand): Promise<ExecuteCuttingOptimizationResult> {
    // ── 1. Load WorkOrder ───────────────────────────────────────────────────────
    const workOrder = await this.workOrderRepo.findById(cmd.tenantId, cmd.workOrderId);
    if (!workOrder)
      throw new NotFoundException(`WorkOrder "${cmd.workOrderId}" not found`);

    // Idempotency guard
    if (workOrder.status === WorkOrderStatus.OPTIMIZING && workOrder.cuttingPlan) {
      this.logger.warn(`WorkOrder ${cmd.workOrderId} already optimized — returning cached plan`);
      return this.toResult(workOrder);
    }

    if (workOrder.status !== WorkOrderStatus.PENDING)
      throw new UnprocessableEntityException(
        `WorkOrder must be PENDING to run optimization (current: ${workOrder.status})`,
      );

    // ── 2. Collect available stock from inventory ──────────────────────────────

    // Group requirements by materialSku to query inventory efficiently
    const skuSet = new Set(workOrder.requirements.map(r => r.materialSku.value));

    const [boards, offcuts] = await Promise.all([
      Promise.all(
        [...skuSet].map(skuStr => {
          const req = workOrder.requirements.find(r => r.materialSku.value === skuStr)!;
          return this.boardRepo.findAvailable({
            tenantId:      cmd.tenantId,
            materialSku:   req.materialSku,
            availableOnly: true,
          });
        }),
      ).then(arrays => arrays.flat()),
      Promise.all(
        [...skuSet].map(skuStr => {
          const req = workOrder.requirements.find(r => r.materialSku.value === skuStr)!;
          return this.offcutRepo.findAvailable({
            tenantId:      cmd.tenantId,
            materialSku:   req.materialSku,
            availableOnly: true,
          });
        }),
      ).then(arrays => arrays.flat()),
    ]);

    if (boards.length === 0 && offcuts.length === 0)
      throw new UnprocessableEntityException(
        'No available stock found for the required materials. Add boards to inventory first.',
      );

    this.logger.log(
      `WorkOrder ${cmd.workOrderId}: found ${boards.length} boards + ${offcuts.length} offcuts for optimization`,
    );

    // ── 3. Build CuttingRequest ───────────────────────────────────────────────

    // Offcuts first — prefer smaller stock to preserve full boards
    const offcutStocks: CuttingStock[] = offcuts
      .sort((a, b) => a.dimensions.areaMm2 - b.dimensions.areaMm2)  // smallest first
      .map(o => ({
        id:        o.id.toString(),
        isOffcut:  true,
        widthMm:   o.dimensions.widthMm,
        heightMm:  o.dimensions.heightMm,
      }));

    const boardStocks: CuttingStock[] = boards.map(b => ({
      id:        b.id.toString(),
      isOffcut:  false,
      widthMm:   b.dimensions.widthMm,
      heightMm:  b.dimensions.heightMm,
    }));

    const pieces: CuttingPiece[] = workOrder.requirements.map(req => ({
      id:        req.id,
      widthMm:   req.dimensions.widthMm,
      heightMm:  req.dimensions.heightMm,
      quantity:  req.quantity,
      label:     req.label,
      canRotate: cmd.allowRotation ?? true,
    }));

    const cuttingRequest: CuttingRequest = {
      jobId:         cmd.workOrderId,
      stocks:        [...offcutStocks, ...boardStocks],  // offcuts before boards
      pieces,
      kerfMm:        cmd.kerfMm ?? 3,
      allowRotation: cmd.allowRotation ?? true,
    };

    // ── 4. Call Python cutting engine ─────────────────────────────────────────

    const engineResult = await this.cuttingEngine.optimize(cuttingRequest);
    if (engineResult.isFail())
      throw new UnprocessableEntityException(engineResult.error);

    const plan = engineResult.value;

    // ── 5a. Reserve the boards/offcuts used in the plan ───────────────────────

    const usedIds = plan.boardAllocations.map(a => a.boardId);
    const usedBoards   = boards.filter(b => usedIds.includes(b.id.toString()));
    const usedOffcuts  = offcuts.filter(o => usedIds.includes(o.id.toString()));

    const reserveResults: Result<void>[] = [
      ...usedBoards.map(b => b.reserve(cmd.workOrderId)),
      ...usedOffcuts.map(o => o.reserve(cmd.workOrderId)),
    ];

    const combined = Result.combine(reserveResults);
    if (combined.isFail())
      throw new UnprocessableEntityException(`Stock reservation failed: ${combined.error}`);

    // ── 5b. Attach plan → WorkOrder emits domain event ────────────────────────

    const attachResult = workOrder.attachCuttingPlan(plan, usedIds);
    if (attachResult.isFail())
      throw new UnprocessableEntityException(attachResult.error);

    // ── 5c. Persist everything + flush events to Kafka ────────────────────────

    await Promise.all([
      this.workOrderRepo.save(workOrder),
      this.boardRepo.saveMany(usedBoards),
      this.offcutRepo.saveMany(usedOffcuts),
    ]);

    // EventBus flushes domain events from WorkOrder to Kafka
    const events = workOrder.clearEvents();
    await this.eventBus.publishAll(events);

    this.logger.log(
      `WorkOrder ${cmd.workOrderId} optimized — ` +
      `efficiency: ${plan.efficiencyPercent.toFixed(1)}%, ` +
      `${usedBoards.length} boards + ${usedOffcuts.length} offcuts reserved, ` +
      `${events.length} domain events emitted`,
    );

    return this.toResult(workOrder);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private toResult(wo: WorkOrder): ExecuteCuttingOptimizationResult {
    const plan = wo.cuttingPlan!;
    return {
      workOrderId:       wo.id.toString(),
      efficiencyPercent: plan.efficiencyPercent,
      boardsUsed:        plan.boardAllocations.length,
      offcutsToCreate:   plan.boardAllocations.reduce((s, b) => s + b.offcuts.length, 0),
      svgLayout:         plan.svgLayout,
    };
  }
}
