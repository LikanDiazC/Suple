import {
  Controller,
  Get,
  Post,
  Patch,
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

// ─── DTOs ────────────────────────────────────────────────────────────────────

interface CreateOrderDto {
  description?: string;
  crm_contact_id?: string;
  notes?: string;
}

interface UpdateStatusDto {
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PRODUCTION' | 'COMPLETED' | 'CANCELLED';
}

interface AddItemDto {
  material: string;
  width_mm: number;
  height_mm: number;
  quantity?: number;
  unit_cost?: number;
  notes?: string;
}

const VALID_STATUSES = ['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED'] as const;

// ─── Controller ──────────────────────────────────────────────────────────────

@UseGuards(JwtAuthGuard)
@Controller('api/erp/orders')
export class OrdersController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  // ── GET /api/erp/orders ──────────────────────────────────────────────────

  @Get()
  async list(@Req() req: Request) {
    const tenantId = resolveTenantId(req);

    const rows = await this.ds.query<any[]>(
      `
      SELECT
        o.id,
        o.order_number,
        o.description,
        o.status,
        o.total_cost,
        o.notes,
        o.crm_contact_id,
        o.created_at,
        o.updated_at,
        COALESCE(
          cr.properties->'name'->>'value',
          NULLIF(TRIM(
            COALESCE(cr.properties->'first_name'->>'value', '') || ' ' ||
            COALESCE(cr.properties->'last_name'->>'value', '')
          ), ''),
          cr.display_name
        ) AS client_name,
        COALESCE(cr.properties->'email'->>'value', cr.email) AS client_email,
        COUNT(oi.id)::int AS item_count
      FROM erp_orders o
      LEFT JOIN crm_records cr ON cr.id = o.crm_contact_id AND cr.tenant_id = o.tenant_id
      LEFT JOIN erp_order_items oi ON oi.order_id = o.id
      WHERE o.tenant_id = $1
      GROUP BY o.id, cr.properties, cr.display_name, cr.email
      ORDER BY o.created_at DESC
      `,
      [tenantId],
    );

    return rows;
  }

  // ── POST /api/erp/orders ─────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: Request, @Body() dto: CreateOrderDto) {
    const tenantId = resolveTenantId(req);

    const [seqRow] = await this.ds.query<[{ nextval: string }]>(
      `SELECT nextval('erp_order_seq') AS nextval`,
    );
    const orderNumber = `PED-${seqRow.nextval}`;

    const [row] = await this.ds.query<any[]>(
      `
      INSERT INTO erp_orders (tenant_id, order_number, description, crm_contact_id, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        tenantId,
        orderNumber,
        dto.description ?? null,
        dto.crm_contact_id ?? null,
        dto.notes ?? null,
      ],
    );

    return row;
  }

  // ── GET /api/erp/orders/:id ──────────────────────────────────────────────

  @Get(':id')
  async getOne(@Req() req: Request, @Param('id') id: string) {
    const tenantId = resolveTenantId(req);

    const [order] = await this.ds.query<any[]>(
      `
      SELECT
        o.*,
        COALESCE(
          cr.properties->'name'->>'value',
          NULLIF(TRIM(
            COALESCE(cr.properties->'first_name'->>'value', '') || ' ' ||
            COALESCE(cr.properties->'last_name'->>'value', '')
          ), ''),
          cr.display_name
        ) AS client_name,
        COALESCE(cr.properties->'email'->>'value', cr.email) AS client_email
      FROM erp_orders o
      LEFT JOIN crm_records cr ON cr.id = o.crm_contact_id AND cr.tenant_id = o.tenant_id
      WHERE o.id = $1 AND o.tenant_id = $2
      `,
      [id, tenantId],
    );

    if (!order) throw new NotFoundException(`Order ${id} not found`);

    const items = await this.ds.query<any[]>(
      `SELECT * FROM erp_order_items WHERE order_id = $1 ORDER BY ctid`,
      [id],
    );

    return { ...order, items };
  }

  // ── PATCH /api/erp/orders/:id/status ────────────────────────────────────

  @Patch(':id/status')
  async updateStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    const tenantId = resolveTenantId(req);

    if (!VALID_STATUSES.includes(dto.status)) {
      throw new BadRequestException(`Invalid status: ${dto.status}`);
    }

    const [row] = await this.ds.query<any[]>(
      `
      UPDATE erp_orders
      SET status = $1, updated_at = now()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
      `,
      [dto.status, id, tenantId],
    );

    if (!row) throw new NotFoundException(`Order ${id} not found`);
    return row;
  }

  // ── DELETE /api/erp/orders/:id ───────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: Request, @Param('id') id: string) {
    const tenantId = resolveTenantId(req);

    const result = await this.ds.query(
      `DELETE FROM erp_orders WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );

    if (result[1] === 0) throw new NotFoundException(`Order ${id} not found`);
  }

  // ── POST /api/erp/orders/:id/items ───────────────────────────────────────

  @Post(':id/items')
  @HttpCode(HttpStatus.CREATED)
  async addItem(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: AddItemDto,
  ) {
    const tenantId = resolveTenantId(req);

    // Verify order belongs to tenant
    const [order] = await this.ds.query<any[]>(
      `SELECT id FROM erp_orders WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    if (!order) throw new NotFoundException(`Order ${id} not found`);

    if (!dto.material?.trim()) throw new BadRequestException('material is required');
    if (!dto.width_mm || dto.width_mm <= 0) throw new BadRequestException('width_mm must be > 0');
    if (!dto.height_mm || dto.height_mm <= 0) throw new BadRequestException('height_mm must be > 0');

    const [item] = await this.ds.query<any[]>(
      `
      INSERT INTO erp_order_items (tenant_id, order_id, material, width_mm, height_mm, quantity, unit_cost, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        tenantId,
        id,
        dto.material.trim(),
        dto.width_mm,
        dto.height_mm,
        dto.quantity ?? 1,
        dto.unit_cost ?? 0,
        dto.notes ?? null,
      ],
    );

    // Recalculate total_cost
    await this.ds.query(
      `
      UPDATE erp_orders
      SET total_cost = (
        SELECT COALESCE(SUM(unit_cost * quantity), 0) FROM erp_order_items WHERE order_id = $1
      ), updated_at = now()
      WHERE id = $1
      `,
      [id],
    );

    return item;
  }

  // ── DELETE /api/erp/orders/:id/items/:itemId ─────────────────────────────

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    const tenantId = resolveTenantId(req);

    const result = await this.ds.query(
      `DELETE FROM erp_order_items WHERE id = $1 AND order_id = $2 AND tenant_id = $3`,
      [itemId, id, tenantId],
    );

    if (result[1] === 0) throw new NotFoundException(`Item ${itemId} not found`);

    // Recalculate total_cost
    await this.ds.query(
      `
      UPDATE erp_orders
      SET total_cost = (
        SELECT COALESCE(SUM(unit_cost * quantity), 0) FROM erp_order_items WHERE order_id = $1
      ), updated_at = now()
      WHERE id = $1 AND tenant_id = $2
      `,
      [id, tenantId],
    );
  }

  // ── POST /api/erp/orders/:id/check-stock ─────────────────────────────────

  @Post(':id/check-stock')
  async checkStock(@Req() req: Request, @Param('id') id: string) {
    const tenantId = resolveTenantId(req);

    const [order] = await this.ds.query<any[]>(
      `SELECT id FROM erp_orders WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    if (!order) throw new NotFoundException(`Order ${id} not found`);

    const items = await this.ds.query<any[]>(
      `SELECT id, material, width_mm, height_mm, quantity FROM erp_order_items WHERE order_id = $1`,
      [id],
    );

    const results: Array<{ itemId: string; available: boolean; boardCount: number }> = [];

    for (const item of items) {
      // Match boards: material_sku contains the material name (case-insensitive),
      // board is large enough, and status is AVAILABLE.
      const [countRow] = await this.ds.query<[{ cnt: string }]>(
        `
        SELECT COUNT(*)::int AS cnt
        FROM scm_boards
        WHERE tenant_id = $1
          AND status = 'AVAILABLE'
          AND LOWER(material_sku) LIKE '%' || LOWER($2) || '%'
          AND width_mm  >= $3
          AND height_mm >= $4
        `,
        [tenantId, item.material, item.width_mm, item.height_mm],
      );

      const boardCount = Number(countRow.cnt);
      const available = boardCount > 0;

      // Persist the check result on the item row
      await this.ds.query(
        `UPDATE erp_order_items SET stock_available = $1 WHERE id = $2`,
        [available, item.id],
      );

      results.push({ itemId: item.id, available, boardCount });
    }

    const availableCount = results.filter((r) => r.available).length;

    return {
      items: results,
      summary: {
        total: results.length,
        available: availableCount,
        insufficient: results.length - availableCount,
      },
    };
  }
}
