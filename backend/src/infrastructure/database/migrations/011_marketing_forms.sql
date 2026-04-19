CREATE TABLE IF NOT EXISTS marketing_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketing_form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  form_id UUID NOT NULL REFERENCES marketing_forms(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  ip_address VARCHAR(45),
  source VARCHAR(255)
);

ALTER TABLE marketing_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_form_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON marketing_forms USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY tenant_isolation ON marketing_form_responses USING (tenant_id = current_setting('app.current_tenant')::uuid);
