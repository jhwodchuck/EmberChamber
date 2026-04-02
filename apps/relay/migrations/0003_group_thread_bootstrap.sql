ALTER TABLE auth_challenges ADD COLUMN pending_group_conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL;
ALTER TABLE auth_challenges ADD COLUMN pending_group_invite_token_hash TEXT;

CREATE TABLE IF NOT EXISTS conversation_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'text',
  body_text TEXT,
  attachment_id TEXT REFERENCES attachments(id) ON DELETE SET NULL,
  client_message_id TEXT,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_created_at
  ON conversation_messages(conversation_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_messages_client_message
  ON conversation_messages(conversation_id, sender_account_id, client_message_id)
  WHERE client_message_id IS NOT NULL;
