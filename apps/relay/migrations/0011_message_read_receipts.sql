-- Per-member read cursor for relay-hosted group threads.
-- Stores the created_at timestamp of the latest message the member has seen,
-- so we can compute readByCount without storing a row per message per member.
CREATE TABLE IF NOT EXISTS message_reads (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  account_id      TEXT NOT NULL REFERENCES accounts(id)      ON DELETE CASCADE,
  last_read_at    TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  PRIMARY KEY (conversation_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_conversation
  ON message_reads(conversation_id);
