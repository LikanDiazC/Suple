-- ============================================================================
-- Migration 003 — Journal balance enforcement (Directive 5: double barrier)
-- ============================================================================
-- The domain layer (JournalEntry.ts) refuses to construct an unbalanced entry.
-- This trigger is the second barrier: even raw SQL or a future bug cannot
-- post an unbalanced journal.
--
-- Tables created here are also used by Phase 4 (ERP). Defining them in this
-- migration avoids a circular dependency between SQL and TypeScript fixtures.
-- ============================================================================

CREATE TABLE journal_entries (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  reference    VARCHAR(64) NOT NULL,
  description  TEXT,
  entry_date   DATE NOT NULL,
  status       VARCHAR(16) NOT NULL DEFAULT 'DRAFT'
                 CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED')),
  posted_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, reference)
);

CREATE TABLE journal_line_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id      UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  account_code  VARCHAR(32) NOT NULL,
  type          VARCHAR(8) NOT NULL CHECK (type IN ('DEBIT', 'CREDIT')),
  amount_cents  BIGINT NOT NULL CHECK (amount_cents > 0),
  currency      CHAR(3) NOT NULL DEFAULT 'CLP',
  memo          TEXT
);

CREATE INDEX idx_journal_entries_tenant_date ON journal_entries(tenant_id, entry_date);
CREATE INDEX idx_journal_line_items_entry ON journal_line_items(entry_id);

ALTER TABLE journal_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_iso_journal_entries ON journal_entries
  USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_iso_journal_lines ON journal_line_items
  USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- ─────────────────────────────────────────────────────────────────────────────
-- Balance enforcement (Directive 5)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
  total_debits  NUMERIC;
  total_credits NUMERIC;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN type = 'DEBIT'  THEN amount_cents ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'CREDIT' THEN amount_cents ELSE 0 END), 0)
    INTO total_debits, total_credits
  FROM journal_line_items
  WHERE entry_id = NEW.id;

  IF total_debits <> total_credits THEN
    RAISE EXCEPTION
      'Unbalanced journal entry %: debits=% credits=% (delta=%)',
      NEW.id, total_debits, total_credits, total_debits - total_credits;
  END IF;

  IF total_debits = 0 THEN
    RAISE EXCEPTION 'Journal entry % cannot be posted with zero amounts', NEW.id;
  END IF;

  NEW.posted_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_journal_balance
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  WHEN (NEW.status = 'POSTED' AND OLD.status = 'DRAFT')
  EXECUTE FUNCTION check_journal_balance();

-- Posted entries are immutable: block UPDATE and DELETE on lines once posted.
CREATE OR REPLACE FUNCTION protect_posted_journal_lines()
RETURNS TRIGGER AS $$
DECLARE
  parent_status VARCHAR;
BEGIN
  SELECT status INTO parent_status FROM journal_entries
    WHERE id = COALESCE(NEW.entry_id, OLD.entry_id);
  IF parent_status = 'POSTED' THEN
    RAISE EXCEPTION 'Journal lines for POSTED entry % are immutable', COALESCE(NEW.entry_id, OLD.entry_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_journal_lines
  BEFORE UPDATE OR DELETE ON journal_line_items
  FOR EACH ROW
  EXECUTE FUNCTION protect_posted_journal_lines();
