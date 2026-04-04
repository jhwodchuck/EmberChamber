-- 0010: profile avatar, message editing, group settings updates

-- Store the attachment ID for account avatar (null = no avatar set).
ALTER TABLE accounts ADD COLUMN avatar_attachment_id TEXT REFERENCES attachments(id) ON DELETE SET NULL;

-- Tracks when a relay-hosted message was last edited.
ALTER TABLE conversation_messages ADD COLUMN edited_at TEXT;
