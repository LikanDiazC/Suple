-- ============================================================================
-- Migration 004 — CRM (records, associations, object definitions)
-- ============================================================================

CREATE TABLE crm_object_definitions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  object_type     VARCHAR(64) NOT NULL,
  label_singular  VARCHAR(128) NOT NULL,
  label_plural    VARCHAR(128) NOT NULL,
  properties_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, object_type)
);

CREATE TABLE crm_records (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  object_definition_id  UUID,
  object_type           VARCHAR(64) NOT NULL,
  properties            JSONB NOT NULL DEFAULT '{}'::jsonb,
  email                 VARCHAR(320),
  domain                VARCHAR(255),
  display_name          VARCHAR(512),
  owner_id              VARCHAR(64),
  lifecycle_stage       VARCHAR(64),
  lead_status           VARCHAR(64),
  archived              BOOLEAN NOT NULL DEFAULT FALSE,
  created_by            VARCHAR(64) NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity         TIMESTAMPTZ
);

CREATE INDEX idx_crm_records_tenant_type ON crm_records(tenant_id, object_type) WHERE archived = FALSE;
CREATE INDEX idx_crm_records_email ON crm_records(tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_crm_records_domain ON crm_records(tenant_id, domain) WHERE domain IS NOT NULL;
CREATE INDEX idx_crm_records_owner ON crm_records(tenant_id, owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX idx_crm_records_props_gin ON crm_records USING GIN (properties);
CREATE INDEX idx_crm_records_name_trgm ON crm_records USING GIN (display_name gin_trgm_ops);

CREATE TABLE crm_associations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_record_id    UUID NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  to_record_id      UUID NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  association_type  VARCHAR(64) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_record_id, to_record_id, association_type)
);
CREATE INDEX idx_crm_associations_to ON crm_associations(to_record_id);

ALTER TABLE crm_object_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_records            ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_associations       ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_iso_crm_object_definitions ON crm_object_definitions
  USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_iso_crm_records ON crm_records
  USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_iso_crm_associations ON crm_associations
  USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
