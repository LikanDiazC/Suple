-- ============================================================================
-- Migration 002 — processed_events (Kafka idempotency ledger)
-- ============================================================================
-- Every Kafka consumer MUST insert a row here in the SAME transaction as
-- the business write. The PK on event_id makes redelivery a no-op.
-- ============================================================================

CREATE TABLE processed_events (
  event_id      UUID PRIMARY KEY,
  topic         VARCHAR(255) NOT NULL,
  tenant_id     UUID NOT NULL,
  consumer_name VARCHAR(255) NOT NULL,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_processed_events_at ON processed_events(processed_at);
CREATE INDEX idx_processed_events_tenant ON processed_events(tenant_id);

-- This table is intentionally NOT RLS-scoped: it is system infrastructure.
-- Retention: a periodic job removes rows older than 30 days.
COMMENT ON TABLE processed_events IS
  'Kafka consumer idempotency ledger. INSERT inside the same DB transaction as the business write. Retention: 30 days.';
