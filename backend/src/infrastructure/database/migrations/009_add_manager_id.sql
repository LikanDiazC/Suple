-- Migration 009: Add manager_id hierarchy to users
-- Run this in pgAdmin AFTER migration 001

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN users.manager_id IS 'Direct manager of this user. NULL = no manager (top-level).';
