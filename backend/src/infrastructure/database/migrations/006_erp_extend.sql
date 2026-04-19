-- ============================================================================
-- Migration 006 — ERP extensions to journal_* tables
-- ============================================================================
-- Adds Universal Journal columns aligned with JournalEntry domain entity
-- (fiscal year/period, source, documentDate, dimensions, etc.).
-- ============================================================================

ALTER TABLE journal_entries
  ADD COLUMN fiscal_year     INT,
  ADD COLUMN fiscal_period   INT,
  ADD COLUMN document_date   DATE,
  ADD COLUMN currency        CHAR(3) NOT NULL DEFAULT 'CLP',
  ADD COLUMN source          VARCHAR(32) NOT NULL DEFAULT 'MANUAL'
    CHECK (source IN ('MANUAL','AP_INVOICE','AR_INVOICE','PAYROLL',
                      'ASSET_DEPRECIATION','INVENTORY_VALUATION',
                      'BANK_RECONCILIATION','INTERCOMPANY','SYSTEM_ACCRUAL')),
  ADD COLUMN reversal_of_entry_id UUID REFERENCES journal_entries(id),
  ADD COLUMN created_by      UUID;

ALTER TABLE journal_line_items
  ADD COLUMN line_number     INT,
  ADD COLUMN cost_center     VARCHAR(32),
  ADD COLUMN profit_center   VARCHAR(32),
  ADD COLUMN business_partner VARCHAR(64),
  ADD COLUMN asset_id        VARCHAR(64),
  ADD COLUMN dimensions      JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX idx_journal_entries_tenant_period
  ON journal_entries(tenant_id, fiscal_year, fiscal_period);
CREATE INDEX idx_journal_line_items_account
  ON journal_line_items(tenant_id, account_code);
