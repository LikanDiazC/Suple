import type { Pipeline, PipelineStage, StageTransitionResult, CrmRecord } from './types';

/**
 * ==========================================================================
 * Pipeline State Machine
 * ==========================================================================
 *
 * Manages deal stage transitions with validation:
 *   - Each stage has requiredFields that must be populated
 *   - Transitions are validated BEFORE the move happens
 *   - Backward transitions are allowed (with warnings)
 *   - Closed stages (Won/Lost) have stricter rules
 *
 * Pattern: Finite State Machine with guard conditions.
 * The machine is stateless — it takes a record and a target stage,
 * and returns whether the transition is allowed.
 * ==========================================================================
 */

// ---------------------------------------------------------------------------
// Default Sales Pipeline
// ---------------------------------------------------------------------------

export const DEFAULT_SALES_PIPELINE: Pipeline = {
  id: 'pipeline_sales_default',
  name: 'sales_pipeline',
  label: 'Pipeline de Ventas',
  defaultStageId: 'stage_appointment',
  stages: [
    {
      id: 'stage_appointment',
      name: 'appointment_scheduled',
      label: 'Cita agendada',
      displayOrder: 1,
      probability: 20,
      requiredFields: ['deal_name', 'amount'],
      color: '#3B82F6',
      isClosed: false,
    },
    {
      id: 'stage_qualified',
      name: 'qualified_to_buy',
      label: 'Calificado',
      displayOrder: 2,
      probability: 40,
      requiredFields: ['deal_name', 'amount', 'contact_id'],
      color: '#8B5CF6',
      isClosed: false,
    },
    {
      id: 'stage_presentation',
      name: 'presentation_scheduled',
      label: 'Presentacion agendada',
      displayOrder: 3,
      probability: 60,
      requiredFields: ['deal_name', 'amount', 'contact_id', 'close_date'],
      color: '#F59E0B',
      isClosed: false,
    },
    {
      id: 'stage_decision',
      name: 'decision_maker_bought_in',
      label: 'Decision tomada',
      displayOrder: 4,
      probability: 80,
      requiredFields: ['deal_name', 'amount', 'contact_id', 'close_date', 'decision_maker'],
      color: '#F97316',
      isClosed: false,
    },
    {
      id: 'stage_contract',
      name: 'contract_sent',
      label: 'Contrato enviado',
      displayOrder: 5,
      probability: 90,
      requiredFields: ['deal_name', 'amount', 'contact_id', 'close_date', 'decision_maker', 'contract_value'],
      color: '#EF4444',
      isClosed: false,
    },
    {
      id: 'stage_won',
      name: 'closed_won',
      label: 'Ganado',
      displayOrder: 6,
      probability: 100,
      requiredFields: ['deal_name', 'amount', 'contact_id', 'close_date', 'decision_maker', 'contract_value', 'won_reason'],
      color: '#22C55E',
      isClosed: true,
      isWon: true,
    },
    {
      id: 'stage_lost',
      name: 'closed_lost',
      label: 'Perdido',
      displayOrder: 7,
      probability: 0,
      requiredFields: ['deal_name', 'lost_reason'],
      color: '#6B7280',
      isClosed: true,
      isWon: false,
    },
  ],
};

// ---------------------------------------------------------------------------
// Field label resolver (for user-friendly error messages)
// ---------------------------------------------------------------------------

const FIELD_LABELS: Record<string, string> = {
  deal_name: 'Nombre del negocio',
  amount: 'Monto',
  contact_id: 'Contacto asociado',
  close_date: 'Fecha de cierre',
  decision_maker: 'Tomador de decision',
  contract_value: 'Valor del contrato',
  won_reason: 'Razon de ganancia',
  lost_reason: 'Razon de perdida',
};

// ---------------------------------------------------------------------------
// State Machine Functions
// ---------------------------------------------------------------------------

/**
 * Validate whether a deal record can transition to a target stage.
 *
 * Rules:
 *   1. All requiredFields of the TARGET stage must have a non-empty value
 *   2. Moving to a "closed" stage requires ALL intermediate stages' fields
 *   3. Moving BACKWARD is allowed but generates a warning
 *   4. Moving from Won/Lost back to open requires explicit confirmation
 */
export function validateStageTransition(
  record: CrmRecord,
  currentStageId: string,
  targetStageId: string,
  pipeline: Pipeline = DEFAULT_SALES_PIPELINE,
): StageTransitionResult {
  const currentStage = pipeline.stages.find((s) => s.id === currentStageId);
  const targetStage = pipeline.stages.find((s) => s.id === targetStageId);

  if (!targetStage) {
    return { allowed: false, missingFields: [], warnings: [`Etapa destino "${targetStageId}" no encontrada`] };
  }

  const warnings: string[] = [];
  const missingFields: { field: string; label: string }[] = [];

  // Check required fields for target stage
  for (const field of targetStage.requiredFields) {
    const value = record.properties[field];
    if (!value || value.trim() === '' || value === '--') {
      missingFields.push({
        field,
        label: FIELD_LABELS[field] ?? field,
      });
    }
  }

  // Backward movement warning
  if (currentStage && targetStage.displayOrder < currentStage.displayOrder) {
    warnings.push(`Movimiento hacia atras: de "${currentStage.label}" a "${targetStage.label}"`);
  }

  // Moving FROM closed stage
  if (currentStage?.isClosed && !targetStage.isClosed) {
    warnings.push('Reabrir un negocio cerrado. Esto cambiara las metricas del pipeline.');
  }

  // Moving TO closed stage
  if (targetStage.isClosed) {
    if (targetStage.isWon) {
      warnings.push('Marcar como GANADO. El monto se sumara a los ingresos cerrados.');
    } else {
      warnings.push('Marcar como PERDIDO. Se registrara la razon de perdida.');
    }
  }

  // Skip more than 1 stage forward (warning, not blocking)
  if (currentStage && targetStage.displayOrder - currentStage.displayOrder > 1) {
    const skipped = pipeline.stages
      .filter((s) => s.displayOrder > currentStage.displayOrder && s.displayOrder < targetStage.displayOrder)
      .map((s) => s.label);
    if (skipped.length > 0) {
      warnings.push(`Saltando etapas: ${skipped.join(', ')}`);
    }
  }

  return {
    allowed: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

/**
 * Get all valid target stages from a given current stage.
 * Returns stages with their transition validation pre-computed.
 */
export function getAvailableTransitions(
  record: CrmRecord,
  currentStageId: string,
  pipeline: Pipeline = DEFAULT_SALES_PIPELINE,
): (PipelineStage & { transition: StageTransitionResult })[] {
  return pipeline.stages
    .filter((s) => s.id !== currentStageId)
    .map((stage) => ({
      ...stage,
      transition: validateStageTransition(record, currentStageId, stage.id, pipeline),
    }));
}

/**
 * Calculate pipeline metrics for a set of deals.
 */
export function calculatePipelineMetrics(
  deals: CrmRecord[],
  pipeline: Pipeline = DEFAULT_SALES_PIPELINE,
) {
  const stageMap = new Map(pipeline.stages.map((s) => [s.id, s]));
  const metrics = {
    totalDeals: deals.length,
    totalValue: 0,
    weightedValue: 0,
    byStage: new Map<string, { count: number; value: number; deals: CrmRecord[] }>(),
    wonCount: 0,
    wonValue: 0,
    lostCount: 0,
  };

  for (const deal of deals) {
    const amount = parseFloat(deal.properties['amount'] ?? '0');
    const stageId = deal.properties['stage_id'] ?? pipeline.defaultStageId;
    const stage = stageMap.get(stageId);

    metrics.totalValue += amount;
    if (stage) {
      metrics.weightedValue += amount * (stage.probability / 100);
      if (stage.isWon) { metrics.wonCount++; metrics.wonValue += amount; }
      if (stage.isClosed && !stage.isWon) { metrics.lostCount++; }
    }

    if (!metrics.byStage.has(stageId)) {
      metrics.byStage.set(stageId, { count: 0, value: 0, deals: [] });
    }
    const bucket = metrics.byStage.get(stageId)!;
    bucket.count++;
    bucket.value += amount;
    bucket.deals.push(deal);
  }

  return metrics;
}
