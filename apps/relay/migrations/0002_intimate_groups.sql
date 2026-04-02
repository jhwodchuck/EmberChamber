ALTER TABLE accounts ADD COLUMN bio TEXT;
ALTER TABLE accounts ADD COLUMN notification_preview_mode TEXT NOT NULL DEFAULT 'discreet';
ALTER TABLE accounts ADD COLUMN auto_download_sensitive_media INTEGER NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN allow_sensitive_export INTEGER NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN secure_app_switcher INTEGER NOT NULL DEFAULT 1;

ALTER TABLE auth_challenges ADD COLUMN requested_device_label TEXT;

ALTER TABLE conversations ADD COLUMN member_cap INTEGER NOT NULL DEFAULT 12;
ALTER TABLE conversations ADD COLUMN sensitive_media_default INTEGER NOT NULL DEFAULT 1;
ALTER TABLE conversations ADD COLUMN join_rule_text TEXT;
ALTER TABLE conversations ADD COLUMN allow_member_invites INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN invite_freeze_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE conversation_invites ADD COLUMN note TEXT;

ALTER TABLE attachments ADD COLUMN content_class TEXT NOT NULL DEFAULT 'image';
ALTER TABLE attachments ADD COLUMN retention_mode TEXT NOT NULL DEFAULT 'private_vault';
ALTER TABLE attachments ADD COLUMN protection_profile TEXT NOT NULL DEFAULT 'sensitive_media';
ALTER TABLE attachments ADD COLUMN preview_blur_hash TEXT;
ALTER TABLE attachments ADD COLUMN conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL;
ALTER TABLE attachments ADD COLUMN conversation_epoch INTEGER;

ALTER TABLE reports ADD COLUMN target_attachment_id TEXT REFERENCES attachments(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN evidence_message_ids_json TEXT;

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_invites_conversation_id ON conversation_invites(conversation_id);
CREATE INDEX IF NOT EXISTS idx_attachments_conversation_id ON attachments(conversation_id);
