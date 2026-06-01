-- Reply threading support for relay-hosted messages.
ALTER TABLE conversation_messages ADD COLUMN reply_to_message_id TEXT;
ALTER TABLE conversation_messages ADD COLUMN reply_to_text TEXT;
ALTER TABLE conversation_messages ADD COLUMN reply_to_sender_display_name TEXT;
