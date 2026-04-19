import {
  Controller, Get, Post, Delete, Body, Param, Req, Query,
  HttpCode, HttpStatus, NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { resolveTenantId } from '../../../../shared/helpers/resolveTenantId';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FormFieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select';

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
}

interface CreateFormDto {
  name: string;
  description?: string;
  fields: FormField[];
}

interface SubmitFormDto {
  data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

@Controller('api/marketing/forms')
export class MarketingFormController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  // ── List forms ────────────────────────────────────────────────────────────

  @Get()
  async list(
    @Req() req: Request,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const tenantId = resolveTenantId(req);
    const offset = (Math.max(1, parseInt(page) || 1) - 1) * Math.min(100, parseInt(limit) || 20);
    const take = Math.min(100, parseInt(limit) || 20);

    const rows = await this.ds.query<Array<Record<string, unknown>>>(
      `SELECT
         f.id,
         f.tenant_id,
         f.name,
         f.description,
         f.fields,
         f.status,
         f.created_at,
         f.updated_at,
         COALESCE(r.response_count, 0)::int AS response_count
       FROM marketing_forms f
       LEFT JOIN (
         SELECT form_id, COUNT(*) AS response_count
         FROM marketing_form_responses
         WHERE tenant_id = $1
         GROUP BY form_id
       ) r ON r.form_id = f.id
       WHERE f.tenant_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, take, offset],
    );

    const [countRow] = await this.ds.query<Array<{ total: string }>>(
      `SELECT COUNT(*)::int AS total FROM marketing_forms WHERE tenant_id = $1`,
      [tenantId],
    );

    return { items: rows, total: parseInt(countRow.total) };
  }

  // ── Create form ───────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: Request, @Body() dto: CreateFormDto) {
    const tenantId = resolveTenantId(req);

    const [row] = await this.ds.query<Array<Record<string, unknown>>>(
      `INSERT INTO marketing_forms (tenant_id, name, description, fields, status)
       VALUES ($1, $2, $3, $4::jsonb, 'ACTIVE')
       RETURNING *`,
      [tenantId, dto.name, dto.description ?? null, JSON.stringify(dto.fields ?? [])],
    );
    return row;
  }

  // ── Get single form with response count ───────────────────────────────────

  @Get(':id')
  async getOne(@Req() req: Request, @Param('id') id: string) {
    const tenantId = resolveTenantId(req);

    const rows = await this.ds.query<Array<Record<string, unknown>>>(
      `SELECT
         f.*,
         COALESCE(r.response_count, 0)::int AS response_count
       FROM marketing_forms f
       LEFT JOIN (
         SELECT form_id, COUNT(*) AS response_count
         FROM marketing_form_responses
         WHERE tenant_id = $1
         GROUP BY form_id
       ) r ON r.form_id = f.id
       WHERE f.id = $2 AND f.tenant_id = $1`,
      [tenantId, id],
    );

    if (!rows.length) throw new NotFoundException(`Form ${id} not found`);
    return rows[0];
  }

  // ── Delete form ───────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: Request, @Param('id') id: string) {
    const tenantId = resolveTenantId(req);

    const result = await this.ds.query<Array<{ id: string }>>(
      `DELETE FROM marketing_forms WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId],
    );
    if (!result.length) throw new NotFoundException(`Form ${id} not found`);
  }

  // ── List responses ────────────────────────────────────────────────────────

  @Get(':id/responses')
  async listResponses(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    const tenantId = resolveTenantId(req);
    const offset = (Math.max(1, parseInt(page) || 1) - 1) * Math.min(200, parseInt(limit) || 50);
    const take = Math.min(200, parseInt(limit) || 50);

    // Verify the form belongs to tenant
    const formCheck = await this.ds.query<Array<{ id: string }>>(
      `SELECT id FROM marketing_forms WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    if (!formCheck.length) throw new NotFoundException(`Form ${id} not found`);

    const rows = await this.ds.query<Array<Record<string, unknown>>>(
      `SELECT id, form_id, data, submitted_at, ip_address, source
       FROM marketing_form_responses
       WHERE form_id = $1 AND tenant_id = $2
       ORDER BY submitted_at DESC
       LIMIT $3 OFFSET $4`,
      [id, tenantId, take, offset],
    );

    const [countRow] = await this.ds.query<Array<{ total: string }>>(
      `SELECT COUNT(*)::int AS total FROM marketing_form_responses WHERE form_id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );

    return { items: rows, total: parseInt(countRow.total) };
  }

  // ── Public submit (no auth required — guard is skipped via controller prefix) ──

  @Post(':id/submit')
  @HttpCode(HttpStatus.CREATED)
  async submit(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SubmitFormDto,
  ) {
    // For public submissions we look up tenant from the form itself
    const formRows = await this.ds.query<Array<{ id: string; tenant_id: string; status: string }>>(
      `SELECT id, tenant_id, status FROM marketing_forms WHERE id = $1`,
      [id],
    );
    if (!formRows.length) throw new NotFoundException(`Form ${id} not found`);
    const form = formRows[0];
    if (form.status !== 'ACTIVE') {
      throw new NotFoundException(`Form ${id} is not active`);
    }

    const ipAddress =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      req.socket?.remoteAddress ??
      null;

    const [row] = await this.ds.query<Array<Record<string, unknown>>>(
      `INSERT INTO marketing_form_responses (tenant_id, form_id, data, ip_address, source)
       VALUES ($1, $2, $3::jsonb, $4, $5)
       RETURNING *`,
      [
        form.tenant_id,
        id,
        JSON.stringify(dto.data ?? {}),
        ipAddress,
        (req.headers['referer'] as string | undefined) ?? null,
      ],
    );
    return row;
  }
}
