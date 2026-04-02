ALTER TABLE conversations ADD COLUMN history_mode TEXT NOT NULL DEFAULT 'relay_hosted';
ALTER TABLE conversations ADD COLUMN last_message_at TEXT;
ALTER TABLE conversations ADD COLUMN last_message_kind TEXT;

UPDATE conversations
   SET history_mode = CASE
     WHEN kind = 'direct_message' THEN 'device_encrypted'
     ELSE 'relay_hosted'
   END;

ALTER TABLE attachments ADD COLUMN encryption_mode TEXT NOT NULL DEFAULT 'none';
ALTER TABLE attachments ADD COLUMN ciphertext_byte_length INTEGER;
ALTER TABLE attachments ADD COLUMN ciphertext_sha256_b64 TEXT;
ALTER TABLE attachments ADD COLUMN plaintext_byte_length INTEGER;
ALTER TABLE attachments ADD COLUMN plaintext_sha256_b64 TEXT;
ALTER TABLE attachments ADD COLUMN uploaded_at TEXT;
ALTER TABLE attachments ADD COLUMN upload_completed_at TEXT;
ALTER TABLE attachments ADD COLUMN deleted_at TEXT;

UPDATE attachments
   SET plaintext_byte_length = byte_length,
       plaintext_sha256_b64 = sha256_b64,
       uploaded_at = created_at,
       upload_completed_at = created_at
 WHERE uploaded_at IS NULL;

CREATE TABLE IF NOT EXISTS mailbox_dedup (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  recipient_device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  client_message_id TEXT NOT NULL,
  envelope_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  PRIMARY KEY (conversation_id, sender_device_id, recipient_device_id, client_message_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at_desc
  ON conversations(updated_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
  ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_attachments_expires_at
  ON attachments(expires_at);
CREATE INDEX IF NOT EXISTS idx_attachments_deleted_at
  ON attachments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_expires_at
  ON auth_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_device_links_expires_at
  ON device_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_conversation_invites_expires_at
  ON conversation_invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_mailbox_dedup_expires_at
  ON mailbox_dedup(expires_at);
