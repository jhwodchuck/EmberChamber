-- passkeys table exists from 0001_initial.sql but is missing WebAuthn replay-protection fields
ALTER TABLE passkeys ADD COLUMN counter INTEGER NOT NULL DEFAULT 0;
ALTER TABLE passkeys ADD COLUMN device_type TEXT NOT NULL DEFAULT 'singleDevice';
ALTER TABLE passkeys ADD COLUMN backed_up INTEGER NOT NULL DEFAULT 0;

-- Ephemeral challenge store for passkey registration and authentication flows (TTL 10 min).
-- Separate from auth_challenges which is specialized for magic-link email flows.
CREATE TABLE IF NOT EXISTS passkey_challenges (
  id          TEXT PRIMARY KEY,
  account_id  TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  challenge   TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK(kind IN ('register', 'authenticate')),
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS passkey_challenges_account_idx ON passkey_challenges(account_id);
