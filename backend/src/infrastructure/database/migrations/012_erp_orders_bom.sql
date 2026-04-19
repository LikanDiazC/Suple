-- ============================================================================
-- Migration 011 — ERP Orders / Bill of Materials (BOM)
-- ============================================================================

CREATE TABLE IF NOT EXISTS erp_orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL,
  order_number   VARCHAR(50) NOT NULL,
  crm_contact_id UUID,          -- soft FK to crm_records
  description    TEXT,
  status         VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                   CHECK (status IN ('DRAFT','CONFIRMED','IN_PRODUCTION','COMPLETED','CANCELLED')),
  total_cost     NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS erp_order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  order_id         UUID NOT NULL REFERENCES erp_orders(id) ON DELETE CASCADE,
  material         VARCHAR(100) NOT NULL,
  width_mm         INTEGER NOT NULL CHECK (width_mm > 0),
  height_mm        INTEGER NOT NULL CHECK (height_mm > 0),
  quantity         INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_cost        NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes            TEXT,
  stock_available  BOOLEAN DEFAULT NULL   -- NULL=unchecked, TRUE=ok, FALSE=insufficient
);

CREATE INDEX IF NOT EXISTS idx_erp_orders_tenant ON erp_orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_erp_orders_status ON erp_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_erp_order_items_order ON erp_order_items(order_id);

ALTER TABLE erp_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON erp_orders
  USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation ON erp_order_items
  USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE SEQUENCE IF NOT EXISTS erp_order_seq START 1000;
