-- ============================================================
-- 014 — Furniture Catalog (Catálogo de Muebles)
-- ============================================================
-- furniture_catalog  : master list of furniture definitions per tenant
-- furniture_cuts     : standard cuts that belong to a furniture piece
-- erp_order_items    : adds furniture_catalog_id FK (optional link)
-- ============================================================

CREATE TABLE IF NOT EXISTS furniture_catalog (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  category      VARCHAR(100),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_furniture_catalog_tenant ON furniture_catalog(tenant_id);

ALTER TABLE furniture_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY furniture_catalog_tenant ON furniture_catalog
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS furniture_cuts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  furniture_id        UUID NOT NULL REFERENCES furniture_catalog(id) ON DELETE CASCADE,
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  label               VARCHAR(255) NOT NULL,
  material            VARCHAR(100) NOT NULL DEFAULT 'MDF',
  width_mm            NUMERIC(10,2) NOT NULL CHECK (width_mm > 0),
  height_mm           NUMERIC(10,2) NOT NULL CHECK (height_mm > 0),
  thickness_mm        NUMERIC(10,2),
  quantity            INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  notes               TEXT,
  sort_order          INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_furniture_cuts_furniture ON furniture_cuts(furniture_id);
CREATE INDEX IF NOT EXISTS idx_furniture_cuts_tenant    ON furniture_cuts(tenant_id);

ALTER TABLE furniture_cuts ENABLE ROW LEVEL SECURITY;
CREATE POLICY furniture_cuts_tenant ON furniture_cuts
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────────────────
-- Link ERP order items to the furniture that generated them
-- ──────────────────────────────────────────────────────────────

ALTER TABLE erp_order_items
  ADD COLUMN IF NOT EXISTS furniture_catalog_id UUID REFERENCES furniture_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS furniture_cut_id     UUID REFERENCES furniture_cuts(id) ON DELETE SET NULL;
