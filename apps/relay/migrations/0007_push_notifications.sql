CREATE TABLE IF NOT EXISTS device_push_tokens (
  device_id TEXT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  platform TEXT NOT NULL,
  push_environment TEXT,
  app_id TEXT,
  token_ciphertext TEXT NOT NULL,
  token_blind_index TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_registered_at TEXT NOT NULL,
  last_push_attempt_at TEXT,
  last_push_success_at TEXT,
  last_push_error TEXT,
  invalidated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_account_id
  ON device_push_tokens(account_id);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_active
  ON device_push_tokens(account_id, invalidated_at);
