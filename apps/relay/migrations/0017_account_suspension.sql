ALTER TABLE accounts ADD COLUMN suspended_at TEXT;
ALTER TABLE accounts ADD COLUMN suspension_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_accounts_suspended ON accounts(suspended_at) WHERE suspended_at IS NOT NULL;
