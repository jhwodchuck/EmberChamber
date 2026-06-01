-- Server-synced reactions for relay-hosted messages.
ALTER TABLE conversation_messages ADD COLUMN reactions_json TEXT;
