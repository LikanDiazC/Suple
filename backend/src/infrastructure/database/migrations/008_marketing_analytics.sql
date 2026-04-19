-- ============================================================================
-- Migration 008 — Marketing & Analytics
-- ============================================================================

CREATE TABLE marketing_campaigns (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  channel       VARCHAR(32)  NOT NULL CHECK (channel IN ('EMAIL','SMS','WHATSAPP','META','GOOGLE_ADS')),
  status        VARCHAR(16)  NOT NULL DEFAULT 'DRAFT'
                  CHECK (status IN ('DRAFT','SCHEDULED','RUNNING','PAUSED','COMPLETED','CANCELLED')),
  audience      JSONB        NOT NULL DEFAULT '{}'::jsonb,
  content       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at  TIMESTAMPTZ,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_by    VARCHAR(64)  NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mkt_camp_tenant_status ON marketing_campaigns(tenant_id, status);

CREATE TABLE analytics_events (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_name   VARCHAR(64)  NOT NULL,
  user_id      VARCHAR(64),
  entity_type  VARCHAR(64),
  entity_id    UUID,
  properties   JSONB        NOT NULL DEFAULT '{}'::jsonb,
  occurred_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_tenant_event ON analytics_events(tenant_id, event_name, occurred_at DESC);
CREATE INDEX idx_analytics_tenant_entity ON analytics_events(tenant_id, entity_type, entity_id);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events    ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_iso_marketing_campaigns ON marketing_campaigns
  USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_iso_analytics_events ON analytics_events
  USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
