-- Migration 010: CRM deal activity log
-- Each deal can have multiple activities (notes, calls, meetings).

CREATE TABLE IF NOT EXISTS crm_deal_activities (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL,
  deal_id     UUID        NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('NOTE','CALL','MEETING')),
  description TEXT        NOT NULL,
  date        DATE        NOT NULL,
  created_by  UUID,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_deal_activities_deal ON crm_deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_crm_deal_activities_tenant ON crm_deal_activities(tenant_id);
