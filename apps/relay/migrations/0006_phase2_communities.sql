ALTER TABLE conversations ADD COLUMN parent_conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE conversations ADD COLUMN room_access_policy TEXT NOT NULL DEFAULT 'all_members';

ALTER TABLE conversation_invites ADD COLUMN scope TEXT NOT NULL DEFAULT 'conversation';
ALTER TABLE conversation_invites ADD COLUMN target_room_conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_parent_conversation_id
  ON conversations(parent_conversation_id, kind, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_invites_target_room
  ON conversation_invites(target_room_conversation_id);
