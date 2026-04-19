import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../../iam/infrastructure/guards/JwtAuthGuard';
import { resolveTenantId } from '../../../../shared/helpers/resolveTenantId';

interface CreateFurnitureDto {
  name: string;
  description?: string;
  category?: string;
  cuts?: CreateCutDto[];
}

interface CreateCutDto {
  label: string;
  material: string;
  width_mm: number;
  height_mm: number;
  thickness_mm?: number;
  quantity?: number;
  notes?: string;
  sort_order?: number;
}

@UseGuards(JwtAuthGuard)
@Controller('api/erp/furniture')
export class FurnitureCatalogController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  // ── GET /api/erp/furniture ───────────────────────────────────────────────

  @Get()
  async list(@Req() req: Request) {
    const tenantId = resolveTenantId(req);

    const rows = await this.ds.query<any[]>(
      `
      SELECT
        f.id,
        f.name,
        f.description,
        f.category,
        f.created_at,
        f.updated_at,
        COUNT(fc.id)::int AS cut_count
      FROM furniture_catalog f
      LEFT JOIN furniture_cuts fc ON fc.furniture_id = f.id
      WHERE f.tenant_id = $1
      GROUP BY f.id
      ORDER BY f.name ASC
      `,
      [tenantId],
    );

    return rows;
  }

  // ── POST /api/erp/furniture ──────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: Request, @Body() dto: CreateFurnitureDto) {
    const tenantId = resolveTenantId(req);

    if (!dto.name?.trim()) throw new BadRequestException('name is required');

    const [furniture] = await this.ds.query<any[]>(
      `INSERT INTO furniture_catalog (tenant_id, name, description, category)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tenantId, dto.name.trim(), dto.description ?? null, dto.category ?? null],
    );

    if (dto.cuts && dto.cuts.length > 0) {
      await this.insertCuts(tenantId, furniture.id, dto.cuts);
    }

    return this.getOne(req, furniture.id);
  }

  // ── GET /api/erp/furniture/:id ───────────────────────────────────────────

  @Get(':id')
  async getOne(@Req() req: Request, @Param('id') id: string) {
    const tenantId = resolveTenantId(req);

    const [furniture] = await this.ds.query<any[]>(
      `SELECT * FROM furniture_catalog WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    if (!furniture) throw new NotFoundException(`Furniture ${id} not found`);

    const cuts = await this.ds.query<any[]>(
      `SELECT * FROM furniture_cuts WHERE furniture_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      [id],
    );

    return { ...furniture, cuts };
  }

  // ── PUT /api/erp/furniture/:id ───────────────────────────────────────────

  @Put(':id')
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: CreateFurnitureDto) {
    const tenantId = resolveTenantId(req);

    if (!dto.name?.trim()) throw new BadRequestException('name is required');

    const [row] = await this.ds.query<any[]>(
      `UPDATE furniture_catalog
       SET name = $1, description = $2, category = $3, updated_at = now()
       WHERE id = $4 AND tenant_id = $5
       RETURNING *`,
      [dto.name.trim(), dto.description ?? null, dto.category ?? null, id, tenantId],
    );
    if (!row) throw new NotFoundException(`Furniture ${id} not found`);

    // Replace all cuts
    if (dto.cuts !== undefined) {
      await this.ds.query(`DELETE FROM furniture_cuts WHERE furniture_id = $1`, [id]);
      if (dto.cuts.length > 0) {
        await this.insertCuts(tenantId, id, dto.cuts);
      }
    }

    return this.getOne(req, id);
  }

  // ── DELETE /api/erp/furniture/:id ───────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: Request, @Param('id') id: string) {
    const tenantId = resolveTenantId(req);
    const result = await this.ds.query(
      `DELETE FROM furniture_catalog WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    if (result[1] === 0) throw new NotFoundException(`Furniture ${id} not found`);
  }

  // ── POST /api/erp/furniture/:id/cuts ────────────────────────────────────

  @Post(':id/cuts')
  @HttpCode(HttpStatus.CREATED)
  async addCut(@Req() req: Request, @Param('id') id: string, @Body() dto: CreateCutDto) {
    const tenantId = resolveTenantId(req);

    const [furniture] = await this.ds.query<any[]>(
      `SELECT id FROM furniture_catalog WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    if (!furniture) throw new NotFoundException(`Furniture ${id} not found`);

    this.validateCut(dto);

    const [cut] = await this.ds.query<any[]>(
      `INSERT INTO furniture_cuts (furniture_id, tenant_id, label, material, width_mm, height_mm, thickness_mm, quantity, notes, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id, tenantId, dto.label.trim(), dto.material, dto.width_mm, dto.height_mm,
       dto.thickness_mm ?? null, dto.quantity ?? 1, dto.notes ?? null, dto.sort_order ?? 0],
    );

    return cut;
  }

  // ── DELETE /api/erp/furniture/:id/cuts/:cutId ───────────────────────────

  @Delete(':id/cuts/:cutId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCut(@Req() req: Request, @Param('id') id: string, @Param('cutId') cutId: string) {
    const tenantId = resolveTenantId(req);
    const result = await this.ds.query(
      `DELETE FROM furniture_cuts WHERE id = $1 AND furniture_id = $2 AND tenant_id = $3`,
      [cutId, id, tenantId],
    );
    if (result[1] === 0) throw new NotFoundException(`Cut ${cutId} not found`);
  }

  // ── POST /api/erp/orders/:orderId/from-furniture/:furnitureId ───────────
  // Import all cuts from a furniture item into an order as order items

  @Post('/apply-to-order/:orderId/:furnitureId')
  @HttpCode(HttpStatus.CREATED)
  async applyToOrder(
    @Req() req: Request,
    @Param('orderId') orderId: string,
    @Param('furnitureId') furnitureId: string,
  ) {
    const tenantId = resolveTenantId(req);

    const [order] = await this.ds.query<any[]>(
      `SELECT id FROM erp_orders WHERE id = $1 AND tenant_id = $2`,
      [orderId, tenantId],
    );
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const [furniture] = await this.ds.query<any[]>(
      `SELECT * FROM furniture_catalog WHERE id = $1 AND tenant_id = $2`,
      [furnitureId, tenantId],
    );
    if (!furniture) throw new NotFoundException(`Furniture ${furnitureId} not found`);

    const cuts = await this.ds.query<any[]>(
      `SELECT * FROM furniture_cuts WHERE furniture_id = $1 ORDER BY sort_order ASC`,
      [furnitureId],
    );

    if (cuts.length === 0) return { inserted: 0, items: [] };

    const inserted: any[] = [];
    for (const cut of cuts) {
      const [item] = await this.ds.query<any[]>(
        `INSERT INTO erp_order_items
           (tenant_id, order_id, material, width_mm, height_mm, quantity, unit_cost, notes, furniture_catalog_id, furniture_cut_id)
         VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)
         RETURNING *`,
        [tenantId, orderId, cut.material, cut.width_mm, cut.height_mm,
         cut.quantity, cut.label ?? cut.notes ?? null, furnitureId, cut.id],
      );
      inserted.push(item);
    }

    // Recalculate total_cost
    await this.ds.query(
      `UPDATE erp_orders SET total_cost = (
         SELECT COALESCE(SUM(unit_cost * quantity), 0) FROM erp_order_items WHERE order_id = $1
       ), updated_at = now() WHERE id = $1`,
      [orderId],
    );

    return { inserted: inserted.length, items: inserted };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private validateCut(dto: CreateCutDto) {
    if (!dto.label?.trim()) throw new BadRequestException('label is required');
    if (!dto.material?.trim()) throw new BadRequestException('material is required');
    if (!dto.width_mm || dto.width_mm <= 0) throw new BadRequestException('width_mm must be > 0');
    if (!dto.height_mm || dto.height_mm <= 0) throw new BadRequestException('height_mm must be > 0');
  }

  private async insertCuts(tenantId: string, furnitureId: string, cuts: CreateCutDto[]) {
    for (let i = 0; i < cuts.length; i++) {
      const cut = cuts[i];
      this.validateCut(cut);
      await this.ds.query(
        `INSERT INTO furniture_cuts (furniture_id, tenant_id, label, material, width_mm, height_mm, thickness_mm, quantity, notes, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [furnitureId, tenantId, cut.label.trim(), cut.material, cut.width_mm, cut.height_mm,
         cut.thickness_mm ?? null, cut.quantity ?? 1, cut.notes ?? null, cut.sort_order ?? i],
      );
    }
  }
}
