-- ============================================================================
-- Migration 001 — Core tenants, users, roles + RLS foundation
-- ============================================================================
-- Every business table in later migrations follows the pattern established
-- here: tenant_id UUID NOT NULL, RLS enabled with USING/WITH CHECK referencing
-- current_setting('app.current_tenant').
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─────────────────────────────────────────────────────────────────────────────
-- Tenants (the tenant registry itself — NOT tenant-scoped)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE tenants (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug         VARCHAR(64) UNIQUE NOT NULL,
  name         VARCHAR(255) NOT NULL,
  status       VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  plan         VARCHAR(32) NOT NULL DEFAULT 'TRIAL',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Roles (system + tenant-specific)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE roles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = system role
  name         VARCHAR(64) NOT NULL,
  permissions  JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- System roles (tenant_id NULL)
INSERT INTO roles (id, tenant_id, name, permissions) VALUES
  (uuid_generate_v4(), NULL, 'SUPER_ADMIN',  '["*"]'::jsonb),
  (uuid_generate_v4(), NULL, 'TENANT_ADMIN', '["tenant:*"]'::jsonb),
  (uuid_generate_v4(), NULL, 'USER',         '["self:*"]'::jsonb);

-- ─────────────────────────────────────────────────────────────────────────────
-- Users (tenant-scoped)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email                 VARCHAR(255) NOT NULL,
  password_hash         VARCHAR(255) NOT NULL,
  full_name             VARCHAR(255) NOT NULL,
  status                VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  must_change_password  BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at         TIMESTAMPTZ,
  failed_login_count    INT NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);
CREATE INDEX idx_users_email ON users(email);  -- for login lookup (system query)

-- Junction: users ↔ roles
CREATE TABLE user_roles (
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id      UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Note: `roles` and `tenants` intentionally NOT RLS-scoped:
--   - tenants: the registry itself, needed for cross-tenant admin operations
--   - roles:   system roles (tenant_id NULL) must be visible to all tenants

CREATE POLICY tenant_isolation_users ON users
  USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_user_roles ON user_roles
  USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- ─────────────────────────────────────────────────────────────────────────────
-- Demo tenant + admin (dev bootstrap)
-- Password hash below is bcrypt('admin123', 10).
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  demo_tenant_id UUID;
  admin_role_id  UUID;
  admin_user_id  UUID;
BEGIN
  INSERT INTO tenants (slug, name) VALUES ('demo', 'Demo Tenant')
    RETURNING id INTO demo_tenant_id;

  SELECT id INTO admin_role_id FROM roles WHERE name = 'TENANT_ADMIN' AND tenant_id IS NULL;

  INSERT INTO users (tenant_id, email, password_hash, full_name, must_change_password)
    VALUES (demo_tenant_id, 'admin@demo.local',
            '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjPeG/pVvXnm7dJf4nB4Z5gU9o1yQG',
            'Demo Admin', TRUE)
    RETURNING id INTO admin_user_id;

  INSERT INTO user_roles (user_id, role_id, tenant_id)
    VALUES (admin_user_id, admin_role_id, demo_tenant_id);
END $$;
