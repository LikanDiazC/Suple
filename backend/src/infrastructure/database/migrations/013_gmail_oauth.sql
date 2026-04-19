-- ============================================================================
-- Migration 013 — Gmail OAuth2 connections + sent message tracking
-- ============================================================================
-- Stores per-user Gmail OAuth tokens (one connection per user, refresh-capable)
-- and a log of messages sent through the app for open/reply tracking.
-- Both tables are tenant-scoped and protected by RLS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS gmail_connections (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email             VARCHAR(255) NOT NULL,
  access_token      TEXT NOT NULL,
  refresh_token     TEXT NOT NULL,
  token_expires_at  TIMESTAMPTZ NOT NULL,
  scope             TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE gmail_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_gmail_connections ON gmail_connections;
CREATE POLICY tenant_isolation_gmail_connections ON gmail_connections
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE INDEX IF NOT EXISTS idx_gmail_connections_tenant ON gmail_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gmail_connections_user ON gmail_connections(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Sent messages (source of truth for tracking pixels + reply detection)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gmail_sent_messages (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gmail_message_id   VARCHAR(255),
  gmail_thread_id    VARCHAR(255),
  contact_id         UUID,
  deal_id            UUID,
  to_email           VARCHAR(255) NOT NULL,
  subject            VARCHAR(500),
  tracking_token     UUID NOT NULL DEFAULT uuid_generate_v4(),
  sent_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_opened_at    TIMESTAMPTZ,
  open_count         INTEGER NOT NULL DEFAULT 0,
  first_reply_at     TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gmail_sent_tenant  ON gmail_sent_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gmail_sent_contact ON gmail_sent_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_gmail_sent_deal    ON gmail_sent_messages(deal_id);
CREATE INDEX IF NOT EXISTS idx_gmail_sent_token   ON gmail_sent_messages(tracking_token);
CREATE INDEX IF NOT EXISTS idx_gmail_sent_thread  ON gmail_sent_messages(gmail_thread_id);

ALTER TABLE gmail_sent_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_gmail_sent ON gmail_sent_messages;
CREATE POLICY tenant_isolation_gmail_sent ON gmail_sent_messages
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
