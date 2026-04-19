-- ============================================================================
-- Seed: Pedido de Mueble a Medida — BPMS demo workflow (7 nodes, 8 transitions)
--
-- Fixed definition id: 00000000-0000-0000-0000-000000000001
-- Safe to re-run: ON CONFLICT (id) DO NOTHING
-- tenant_id NULL → available to all tenants as a system template
-- ============================================================================

INSERT INTO bpms_process_definitions (
  id,
  tenant_id,
  name,
  description,
  version,
  status,
  category,
  icon,
  nodes,
  transitions,
  created_by,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  NULL,
  'Pedido de Mueble a Medida',
  'Flujo completo para gestionar un pedido de mueble personalizado: desde el registro del cliente hasta la entrega, con control de calidad y re-trabajo.',
  1,
  'ACTIVE',
  'produccion',
  '📦',

  -- nodes (JSONB array)
  '[
    {
      "id": "node-start",
      "type": "START_EVENT",
      "name": "Inicio",
      "position": { "x": 80, "y": 240 },
      "config": {}
    },
    {
      "id": "node-registro",
      "type": "USER_TASK",
      "name": "Registro de Pedido",
      "position": { "x": 280, "y": 240 },
      "config": {
        "assigneeRole": "SALES",
        "slaHours": 24,
        "form": [
          { "id": "cliente",      "label": "Cliente",               "type": "text",     "required": true },
          { "id": "descripcion",  "label": "Descripción del mueble", "type": "textarea", "required": true },
          { "id": "precio",       "label": "Precio cotizado",        "type": "number",   "required": true }
        ]
      }
    },
    {
      "id": "node-aceptacion",
      "type": "USER_TASK",
      "name": "Aceptación del Cliente",
      "position": { "x": 520, "y": 240 },
      "config": {
        "assigneeRole": "SALES",
        "approvalOutcomes": ["APROBADO", "RECHAZADO"]
      }
    },
    {
      "id": "node-orden",
      "type": "SERVICE_TASK",
      "name": "Generar Orden de Trabajo",
      "position": { "x": 760, "y": 160 },
      "config": {
        "serviceType": "create_work_order"
      }
    },
    {
      "id": "node-manufactura",
      "type": "USER_TASK",
      "name": "Manufactura",
      "position": { "x": 1000, "y": 160 },
      "config": {
        "assigneeRole": "PRODUCTION",
        "slaHours": 120
      }
    },
    {
      "id": "node-revision",
      "type": "USER_TASK",
      "name": "Revisión de Calidad",
      "position": { "x": 1240, "y": 160 },
      "config": {
        "assigneeRole": "QA",
        "approvalOutcomes": ["APROBADO", "RETRABAJO"]
      }
    },
    {
      "id": "node-end",
      "type": "END_EVENT",
      "name": "Entrega completada",
      "position": { "x": 1480, "y": 240 },
      "config": {}
    }
  ]'::jsonb,

  -- transitions (JSONB array)
  '[
    {
      "fromNodeId": "node-start",
      "toNodeId":   "node-registro",
      "conditions": [],
      "priority":   0,
      "isDefault":  false
    },
    {
      "fromNodeId": "node-registro",
      "toNodeId":   "node-aceptacion",
      "conditions": [],
      "priority":   0,
      "isDefault":  false
    },
    {
      "fromNodeId": "node-aceptacion",
      "toNodeId":   "node-orden",
      "conditions": [{ "variable": "outcome", "operator": "EQUALS", "value": "APROBADO" }],
      "priority":   10,
      "isDefault":  false
    },
    {
      "fromNodeId": "node-aceptacion",
      "toNodeId":   "node-end",
      "conditions": [{ "variable": "outcome", "operator": "EQUALS", "value": "RECHAZADO" }],
      "priority":   5,
      "isDefault":  false
    },
    {
      "fromNodeId": "node-orden",
      "toNodeId":   "node-manufactura",
      "conditions": [],
      "priority":   0,
      "isDefault":  false
    },
    {
      "fromNodeId": "node-manufactura",
      "toNodeId":   "node-revision",
      "conditions": [],
      "priority":   0,
      "isDefault":  false
    },
    {
      "fromNodeId": "node-revision",
      "toNodeId":   "node-end",
      "conditions": [{ "variable": "outcome", "operator": "EQUALS", "value": "APROBADO" }],
      "priority":   10,
      "isDefault":  false
    },
    {
      "fromNodeId": "node-revision",
      "toNodeId":   "node-manufactura",
      "conditions": [{ "variable": "outcome", "operator": "EQUALS", "value": "RETRABAJO" }],
      "priority":   5,
      "isDefault":  false
    }
  ]'::jsonb,

  'system',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
