import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import Anthropic from '@anthropic-ai/sdk';

interface CreateActivityDto {
  type: 'NOTE' | 'CALL' | 'MEETING';
  description: string;
  date: string;
}

/**
 * ==========================================================================
 * Deal Activity Controller
 * ==========================================================================
 *
 *   GET  /api/crm/deals/:id/activities      → List activities for a deal
 *   POST /api/crm/deals/:id/activities      → Log a new activity
 *   POST /api/crm/deals/:id/ai-summary      → Generate AI summary via Claude
 *
 * Uses raw DataSource.query() — no TypeORM entity needed for these tables.
 * ==========================================================================
 */
@Controller('api/crm/deals')
export class DealActivityController {
  private readonly anthropic: Anthropic | null;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.anthropic = apiKey ? new Anthropic({ apiKey }) : null;
  }

  private ctx(req: Request): { tenantId: string; userId: string } {
    const u = req.authenticatedUser;
    if (!u) throw new UnauthorizedException();
    return { tenantId: u.tenantId, userId: u.userId };
  }

  @Get(':id/activities')
  async listActivities(
    @Param('id') dealId: string,
    @Req() req: Request,
  ) {
    const { tenantId } = this.ctx(req);

    const rows = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT id, deal_id, type, description, date, created_by, created_at
       FROM crm_deal_activities
       WHERE deal_id = $1 AND tenant_id = $2
       ORDER BY date DESC, created_at DESC`,
      [dealId, tenantId],
    );

    return { results: rows };
  }

  @Post(':id/activities')
  @HttpCode(HttpStatus.CREATED)
  async createActivity(
    @Param('id') dealId: string,
    @Body() dto: CreateActivityDto,
    @Req() req: Request,
  ) {
    const { tenantId, userId } = this.ctx(req);

    const ALLOWED_TYPES = ['NOTE', 'CALL', 'MEETING'];
    if (!ALLOWED_TYPES.includes(dto.type)) {
      throw new BadRequestException(`Invalid type "${dto.type}". Allowed: ${ALLOWED_TYPES.join(', ')}`);
    }
    if (!dto.description?.trim()) {
      throw new BadRequestException('description is required');
    }
    if (!dto.date) {
      throw new BadRequestException('date is required');
    }

    const rows = await this.dataSource.query<Record<string, unknown>[]>(
      `INSERT INTO crm_deal_activities (tenant_id, deal_id, type, description, date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, deal_id, type, description, date, created_by, created_at`,
      [tenantId, dealId, dto.type, dto.description.trim(), dto.date, userId || null],
    );

    return rows[0];
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AI Summary
  // ──────────────────────────────────────────────────────────────────────────

  @Post(':id/ai-summary')
  @HttpCode(HttpStatus.OK)
  async generateAiSummary(
    @Param('id') dealId: string,
    @Req() req: Request,
  ) {
    const { tenantId } = this.ctx(req);

    if (!this.anthropic) {
      return {
        summary: 'API key no configurada. Configura ANTHROPIC_API_KEY en el backend.',
        generatedAt: '',
      };
    }

    // Fetch deal record
    const dealRows = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT display_name, properties
       FROM crm_records
       WHERE id = $1 AND tenant_id = $2
       LIMIT 1`,
      [dealId, tenantId],
    );

    const deal = dealRows[0] ?? null;
    const props = (deal?.properties as Record<string, unknown>) ?? {};
    const dealName   = (props['deal_name'] as string) || (deal?.display_name as string) || dealId;
    const dealValue  = props['value'] ?? props['amount'] ?? '—';
    const dealStage  = props['stage'] ?? props['deal_stage'] ?? props['lifecycle_stage'] ?? '—';
    const dealNotes  = props['notes'] ?? props['description'] ?? '';

    // Fetch activities
    const activities = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT type, description, date
       FROM crm_deal_activities
       WHERE deal_id = $1 AND tenant_id = $2
       ORDER BY date DESC, created_at DESC
       LIMIT 20`,
      [dealId, tenantId],
    );

    const activitiesText = activities.length > 0
      ? activities
          .map(a => `- [${a['type'] as string}] ${new Date(a['date'] as string).toLocaleDateString('es-CL')}: ${a['description'] as string}`)
          .join('\n')
      : 'Sin actividades registradas.';

    const prompt = `Eres un asistente de ventas. Analiza el siguiente deal de CRM y genera un resumen ejecutivo en español de máximo 3 párrafos:

Deal: ${dealName}
Valor: ${dealValue}
Etapa: ${dealStage}
${dealNotes ? `Notas: ${dealNotes}` : ''}

Actividades:
${activitiesText}

Incluye: estado actual del deal, próximos pasos sugeridos, probabilidad estimada de cierre.`;

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = message.content.find((b: { type: string }) => b.type === 'text') as { type: 'text'; text: string } | undefined;
    const summary = textBlock?.text ?? '';

    return {
      summary,
      generatedAt: new Date().toISOString(),
    };
  }
}
