import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
  Req,
  Logger,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';

import { ExecuteCuttingOptimizationUseCase } from '../../application/use-cases/ExecuteCuttingOptimization';
import { IWorkOrderRepository, WORK_ORDER_REPOSITORY, WorkOrderQuery } from '../../domain/repositories/IWorkOrderRepository';
import { IBoardRepository, BOARD_REPOSITORY } from '../../domain/repositories/IBoardRepository';
import { IOffcutRepository, OFFCUT_REPOSITORY } from '../../domain/repositories/IOffcutRepository';
import { WorkOrder, WorkOrderStatus, CuttingRequirement } from '../../domain/entities/WorkOrder';
import { Board } from '../../domain/entities/Board';
import { Offcut } from '../../domain/entities/Offcut';
import { MaterialSku } from '../../domain/value-objects/MaterialSku';
import { Dimensions } from '../../domain/value-objects/Dimensions';
import { Thickness } from '../../domain/value-objects/Thickness';
import { UniqueId } from '../../../../shared/kernel';

import { resolveTenantId } from '../../../../shared/helpers/resolveTenantId';

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

interface CreateRequirementDto {
  pieceId:       string;
  materialSku:   string;
  widthMm:       number;
  heightMm:      number;
  thicknessMm:   number;
  quantity:      number;
  label?:        string;
  allowRotation: boolean;
}

interface CreateWorkOrderDto {
  productName:  string;
  requirements: CreateRequirementDto[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Serializers — domain → plain JSON (avoid class-transformer dependency)
// ─────────────────────────────────────────────────────────────────────────────

function serializeWorkOrder(wo: WorkOrder) {
  return {
    id:         wo.id.toString(),
    tenantId:   wo.tenantId,
    status:     wo.status,
    productName: wo.productName,
    requirements: wo.requirements.map(r => ({
      pieceId:     r.id,
      materialSku: r.materialSku.value,
      widthMm:     r.dimensions.widthMm,
      heightMm:    r.dimensions.heightMm,
      thicknessMm: 18, // thickness stored on board, not requirement in this schema
      quantity:    r.quantity,
      label:       r.label,
      allowRotation: true,
    })),
    cuttingPlan: wo.cuttingPlan ? {
      workOrderId:        wo.id.toString(),
      efficiencyPercent:  wo.cuttingPlan.efficiencyPercent,
      totalEfficiencyPct: wo.cuttingPlan.efficiencyPercent,
      boardAllocations:   wo.cuttingPlan.boardAllocations.map(a => ({
        stockId:   a.boardId,
        stockType: a.isOffcut ? 'OFFCUT' : 'BOARD',
        widthMm:   0, // would come from board lookup — omit for now
        heightMm:  0,
        placements: a.placements.map(p => ({
          pieceId:  p.requirementId,
          stockId:  a.boardId,
          x:        p.x,
          y:        p.y,
          widthMm:  p.widthMm,
          heightMm: p.heightMm,
          rotated:  p.rotated,
        })),
        offcuts: a.offcuts.map(o => ({
          x:           o.x,
          y:           o.y,
          widthMm:     o.widthMm,
          heightMm:    o.heightMm,
          materialSku: '',
          thicknessMm: 18,
        })),
      })),
      unplacedPieceIds:  wo.cuttingPlan.unplacedPieceIds,
      svgLayouts:        { [wo.id.toString()]: wo.cuttingPlan.svgLayout },
      computedAt:        wo.cuttingPlan.computedAt,
    } : null,
    reservedStockIds: wo.reservedStockIds,
    createdAt:  wo.createdAt,
    updatedAt:  wo.updatedAt,
    completedAt: wo.completedAt,
  };
}

function serializeBoard(b: Board) {
  return {
    id:                    b.id.toString(),
    tenantId:              b.tenantId,
    materialSku:           b.materialSku.value,
    widthMm:               b.dimensions.widthMm,
    heightMm:              b.dimensions.heightMm,
    thicknessMm:           b.thickness.mm,
    status:                b.status,
    reservedByWorkOrderId: b.reservedByWorkOrderId ?? null,
  };
}

function serializeOffcut(o: Offcut) {
  return {
    id:                    o.id.toString(),
    tenantId:              o.tenantId,
    materialSku:           o.materialSku.value,
    widthMm:               o.dimensions.widthMm,
    heightMm:              o.dimensions.heightMm,
    thicknessMm:           o.thickness.mm,
    status:                o.status,
    sourceBoardId:         o.sourceBoardId,
    sourceWorkOrderId:     o.sourceWorkOrderId,
    reservedByWorkOrderId: o.reservedByWorkOrderId ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────────────────────────────

@Controller('api/scm')
export class ScmController {
  private readonly logger = new Logger(ScmController.name);

  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly workOrderRepo: IWorkOrderRepository,
    @Inject(BOARD_REPOSITORY)      private readonly boardRepo:      IBoardRepository,
    @Inject(OFFCUT_REPOSITORY)     private readonly offcutRepo:     IOffcutRepository,
    private readonly optimizeUseCase: ExecuteCuttingOptimizationUseCase,
  ) {}

  // ── Health ──────────────────────────────────────────────────────────────────

  @Get('health')
  health() {
    return { status: 'ok', module: 'SCM', timestamp: new Date().toISOString() };
  }

  // ── Work Orders ─────────────────────────────────────────────────────────────

  @Get('work-orders')
  async listWorkOrders(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('page')   page    = '1',
    @Query('limit')  limit   = '20',
  ) {
    const tenantId = resolveTenantId(req);
    const query: WorkOrderQuery = {
      tenantId,
      page:   Math.max(1, parseInt(page) || 1),
      limit:  Math.min(100, parseInt(limit) || 20),
      status: status as WorkOrderStatus | undefined,
    };

    const { items, total } = await this.workOrderRepo.list(query);
    return {
      items: items.map(serializeWorkOrder),
      total,
      page:  query.page,
      limit: query.limit,
    };
  }

  @Post('work-orders')
  @HttpCode(HttpStatus.CREATED)
  async createWorkOrder(
    @Req() req: Request,
    @Body() dto: CreateWorkOrderDto,
  ) {
    const tenantId = resolveTenantId(req);

    if (!dto.requirements || dto.requirements.length === 0) {
      throw new BadRequestException('At least one cutting requirement is required');
    }

    // Build domain CuttingRequirement objects
    const requirementsResult: CuttingRequirement[] = [];
    for (const r of dto.requirements) {
      const skuResult = MaterialSku.create(r.materialSku);
      if (skuResult.isFail()) throw new BadRequestException(`Invalid materialSku: ${skuResult.error}`);

      const dimResult = Dimensions.create(r.widthMm, r.heightMm);
      if (dimResult.isFail()) throw new BadRequestException(`Invalid dimensions: ${dimResult.error}`);

      requirementsResult.push({
        id:          r.pieceId || UniqueId.create().toString(),
        materialSku: skuResult.value,
        dimensions:  dimResult.value,
        quantity:    r.quantity,
        label:       r.label ?? '',
      });
    }

    const createResult = WorkOrder.create(tenantId, {
      productName:  dto.productName || 'Orden de corte',
      requirements: requirementsResult,
    });

    if (createResult.isFail()) {
      throw new BadRequestException(createResult.error);
    }

    const workOrder = createResult.value;
    await this.workOrderRepo.save(workOrder);

    this.logger.log(`WorkOrder created: ${workOrder.id.toString()} (tenant: ${tenantId})`);
    return serializeWorkOrder(workOrder);
  }

  @Get('work-orders/:id')
  async getWorkOrder(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const tenantId = resolveTenantId(req);
    const wo = await this.workOrderRepo.findById(tenantId, id);
    if (!wo) throw new NotFoundException(`WorkOrder ${id} not found`);
    return serializeWorkOrder(wo);
  }

  @Post('work-orders/:id/optimize')
  @HttpCode(HttpStatus.ACCEPTED)
  async optimizeWorkOrder(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const tenantId = resolveTenantId(req);

    // execute() throws NestJS exceptions on failure (NotFoundException / UnprocessableEntityException)
    await this.optimizeUseCase.execute({ tenantId, workOrderId: id });

    // Re-fetch to return updated state
    const wo = await this.workOrderRepo.findById(tenantId, id);
    return wo ? serializeWorkOrder(wo) : { workOrderId: id, status: 'OPTIMIZING' };
  }

  // ── Confirm Offcuts ─────────────────────────────────────────────────────────

  /**
   * POST work-orders/:id/confirm-offcuts
   *
   * Saves the selected planned offcuts from a completed cutting plan back
   * into the offcut inventory. The client sends only the offcuts the operator
   * chose to save (may be all or a subset).
   *
   * Body: { offcuts: Array<{ widthMm, heightMm, thicknessMm, materialSku, sourceBoardId? }> }
   * Returns: { saved: number, offcuts: SerializedOffcut[] }
   */
  @Post('work-orders/:id/confirm-offcuts')
  @HttpCode(HttpStatus.OK)
  async confirmOffcuts(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: {
      offcuts: Array<{
        widthMm:     number;
        heightMm:    number;
        thicknessMm: number;
        materialSku: string;
        sourceBoardId?: string;
      }>;
    },
  ) {
    const tenantId = resolveTenantId(req);

    const wo = await this.workOrderRepo.findById(tenantId, id);
    if (!wo) throw new NotFoundException(`WorkOrder ${id} not found`);

    if (!Array.isArray(body.offcuts) || body.offcuts.length === 0) {
      return { saved: 0, offcuts: [] };
    }

    const created: Offcut[] = [];

    for (const raw of body.offcuts) {
      const skuResult = MaterialSku.create(raw.materialSku);
      if (skuResult.isFail()) {
        this.logger.warn(`confirm-offcuts: invalid materialSku "${raw.materialSku}", skipping`);
        continue;
      }

      const dimResult = Dimensions.create(raw.widthMm, raw.heightMm);
      if (dimResult.isFail()) {
        this.logger.warn(`confirm-offcuts: invalid dimensions ${raw.widthMm}x${raw.heightMm}, skipping`);
        continue;
      }

      const thickResult = Thickness.create(raw.thicknessMm ?? 18);
      if (thickResult.isFail()) {
        this.logger.warn(`confirm-offcuts: invalid thickness ${raw.thicknessMm}, skipping`);
        continue;
      }

      const offcutResult = Offcut.create(tenantId, {
        materialSku:       skuResult.value,
        thickness:         thickResult.value,
        dimensions:        dimResult.value,
        sourceBoardId:     raw.sourceBoardId ?? id,
        sourceWorkOrderId: id,
      });

      if (offcutResult.isFail()) {
        this.logger.warn(`confirm-offcuts: ${offcutResult.error}, skipping`);
        continue;
      }

      created.push(offcutResult.value);
    }

    if (created.length > 0) {
      await this.offcutRepo.saveMany(created);
      this.logger.log(`confirm-offcuts: saved ${created.length} offcuts for WO ${id} (tenant: ${tenantId})`);
    }

    return {
      saved:   created.length,
      offcuts: created.map(serializeOffcut),
    };
  }

  // ── Inventory ───────────────────────────────────────────────────────────────

  @Get('inventory')
  async getInventory(
    @Req() req: Request,
    @Query('materialSku') materialSkuParam?: string,
    @Query('status')      statusParam?:      string,
  ) {
    const tenantId = resolveTenantId(req);

    let materialSku: MaterialSku | undefined;
    if (materialSkuParam) {
      const r = MaterialSku.create(materialSkuParam);
      if (!r.isFail()) materialSku = r.value;
    }

    const boards   = await this.boardRepo.findAvailable({ tenantId, materialSku, availableOnly: false });
    const offcuts  = await this.offcutRepo.findAvailable({ tenantId, materialSku, availableOnly: false });

    const filteredBoards = statusParam
      ? boards.filter(b => b.status === statusParam)
      : boards;

    const filteredOffcuts = statusParam
      ? offcuts.filter(o => o.status === statusParam)
      : offcuts;

    return {
      boards:  filteredBoards.map(serializeBoard),
      offcuts: filteredOffcuts.map(serializeOffcut),
    };
  }
}
