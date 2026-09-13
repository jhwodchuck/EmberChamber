-- Legacy relay-hosted groups (kind = 'group', history_mode = 'relay_hosted')
-- predate the device-encrypted-group migration; new groups are always created
-- device_encrypted (see handlers/conversations.ts POST /v1/groups). These
-- columns let an operator freeze any remaining legacy rows against new
-- plaintext writes and later purge their message history. This does not
-- apply to communities/rooms, which are relay-hosted by permanent design,
-- not a legacy leftover.
ALTER TABLE conversations ADD COLUMN legacy_history_retired_at TEXT;
ALTER TABLE conversations ADD COLUMN legacy_history_purged_at TEXT;
