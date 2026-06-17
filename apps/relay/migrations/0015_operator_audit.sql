-- Phase 3 (Stable Beta): operator identity, audit trail, and report lifecycle.

-- Operator role flag on accounts. Seeded manually in D1 (no self-service).
ALTER TABLE accounts ADD COLUMN is_operator INTEGER NOT NULL DEFAULT 0;

-- Permanent audit trail for operator/admin actions. Replaces console-only logging
-- so that revocation, recovery, and moderation actions leave an investigable record.
CREATE TABLE IF NOT EXISTS operator_audit_log (
  id TEXT PRIMARY KEY,
  actor_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  actor_kind TEXT NOT NULL DEFAULT 'operator',
  action TEXT NOT NULL,
  target_account_id TEXT,
  target_conversation_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_operator_audit_log_created_at
  ON operator_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operator_audit_log_target_account
  ON operator_audit_log(target_account_id, created_at DESC);

-- Report lifecycle columns. `status` already exists from 0001_initial; add the
-- review/resolution fields the operator queue transitions write to.
ALTER TABLE reports ADD COLUMN reviewed_by_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN reviewed_at TEXT;
ALTER TABLE reports ADD COLUMN resolution_note TEXT;

CREATE INDEX IF NOT EXISTS idx_reports_status_created_at
  ON reports(status, created_at DESC);
