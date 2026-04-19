-- ============================================================================
-- Migration 005 — SCM (Boards, Offcuts, WorkOrders)
-- ============================================================================

CREATE TABLE scm_boards (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  material_sku              VARCHAR(64) NOT NULL,
  thickness_mm              NUMERIC(8,2) NOT NULL CHECK (thickness_mm > 0),
  width_mm                  INT NOT NULL CHECK (width_mm > 0),
  height_mm                 INT NOT NULL CHECK (height_mm > 0),
  status                    VARCHAR(16) NOT NULL DEFAULT 'AVAILABLE'
                              CHECK (status IN ('AVAILABLE','RESERVED','CONSUMED','SCRAPPED')),
  location                  VARCHAR(255),
  batch_code                VARCHAR(64),
  reserved_by_work_order_id UUID,
  received_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scm_boards_tenant_status ON scm_boards(tenant_id, status);
CREATE INDEX idx_scm_boards_material ON scm_boards(tenant_id, material_sku, thickness_mm);

CREATE TABLE scm_offcuts (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_board_id           UUID,
  source_work_order_id      UUID,
  material_sku              VARCHAR(64) NOT NULL,
  thickness_mm              NUMERIC(8,2) NOT NULL CHECK (thickness_mm > 0),
  width_mm                  INT NOT NULL CHECK (width_mm > 0),
  height_mm                 INT NOT NULL CHECK (height_mm > 0),
  status                    VARCHAR(16) NOT NULL DEFAULT 'AVAILABLE'
                              CHECK (status IN ('AVAILABLE','RESERVED','CONSUMED','SCRAPPED')),
  reserved_by_work_order_id UUID,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scm_offcuts_tenant_status ON scm_offcuts(tenant_id, status);
CREATE INDEX idx_scm_offcuts_material ON scm_offcuts(tenant_id, material_sku, thickness_mm);

CREATE TABLE scm_work_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_name    VARCHAR(255) NOT NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','OPTIMIZING','CUTTING','COMPLETED','CANCELLED')),
  requirements    JSONB NOT NULL DEFAULT '[]'::jsonb,
  cutting_plan    JSONB,
  reserved_stock_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_scm_wo_tenant_status ON scm_work_orders(tenant_id, status);
CREATE INDEX idx_scm_wo_created ON scm_work_orders(tenant_id, created_at DESC);

ALTER TABLE scm_boards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_offcuts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_iso_scm_boards ON scm_boards
  USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_iso_scm_offcuts ON scm_offcuts
  USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_iso_scm_work_orders ON scm_work_orders
  USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
