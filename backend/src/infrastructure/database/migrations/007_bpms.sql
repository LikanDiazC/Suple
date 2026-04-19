-- ============================================================================
-- Migration 007 — BPMS (ProcessDefinitions, ProcessInstances, Tasks)
-- ============================================================================

CREATE TABLE bpms_process_definitions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  version         INT  NOT NULL DEFAULT 1,
  status          VARCHAR(16) NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT','ACTIVE','DEPRECATED')),
  category        VARCHAR(64) NOT NULL,
  icon            VARCHAR(64),
  nodes           JSONB NOT NULL DEFAULT '[]'::jsonb,
  transitions     JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by      VARCHAR(64) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bpms_pd_tenant_status ON bpms_process_definitions(tenant_id, status);
CREATE INDEX idx_bpms_pd_category      ON bpms_process_definitions(tenant_id, category);

CREATE TABLE bpms_process_instances (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  definition_id        UUID NOT NULL,
  definition_version   INT  NOT NULL,
  definition_snapshot  JSONB NOT NULL,
  status               VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
                         CHECK (status IN ('ACTIVE','COMPLETED','CANCELLED','SUSPENDED','ERROR')),
  active_node_ids      JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_node_ids   JSONB NOT NULL DEFAULT '[]'::jsonb,
  variables            JSONB NOT NULL DEFAULT '{}'::jsonb,
  join_arrival_count   JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_by           VARCHAR(64) NOT NULL,
  started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ,
  title                VARCHAR(255) NOT NULL,
  entity_ref           JSONB
);

CREATE INDEX idx_bpms_pi_tenant_status ON bpms_process_instances(tenant_id, status);
CREATE INDEX idx_bpms_pi_definition    ON bpms_process_instances(tenant_id, definition_id);
CREATE INDEX idx_bpms_pi_started_by    ON bpms_process_instances(tenant_id, started_by);

CREATE TABLE bpms_tasks (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  instance_id         UUID NOT NULL,
  definition_id       UUID NOT NULL,
  node_id             VARCHAR(64) NOT NULL,
  name                VARCHAR(255) NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  status              VARCHAR(16) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','CANCELLED','OVERDUE')),
  assignee_user_id    VARCHAR(64),
  assignee_role       VARCHAR(64),
  claimed_by          VARCHAR(64),
  claimed_at          TIMESTAMPTZ,
  completed_by        VARCHAR(64),
  completed_at        TIMESTAMPTZ,
  due_date            TIMESTAMPTZ,
  outcome             VARCHAR(64),
  form                JSONB NOT NULL DEFAULT '[]'::jsonb,
  approval_outcomes   JSONB NOT NULL DEFAULT '[]'::jsonb,
  submission          JSONB,
  comments            JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bpms_tasks_tenant_status   ON bpms_tasks(tenant_id, status);
CREATE INDEX idx_bpms_tasks_assignee        ON bpms_tasks(tenant_id, assignee_user_id);
CREATE INDEX idx_bpms_tasks_assignee_role   ON bpms_tasks(tenant_id, assignee_role);
CREATE INDEX idx_bpms_tasks_instance        ON bpms_tasks(tenant_id, instance_id);
CREATE INDEX idx_bpms_tasks_due_date        ON bpms_tasks(tenant_id, due_date) WHERE status IN ('PENDING','IN_PROGRESS');

ALTER TABLE bpms_process_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bpms_process_instances   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bpms_tasks               ENABLE ROW LEVEL SECURITY;

-- Definitions allow tenant_id NULL (system templates) — adjusted policy.
CREATE POLICY tenant_iso_bpms_pd ON bpms_process_definitions
  USING      (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_iso_bpms_pi ON bpms_process_instances
  USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_iso_bpms_tasks ON bpms_tasks
  USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
