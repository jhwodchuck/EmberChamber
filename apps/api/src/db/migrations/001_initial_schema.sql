-- EmberChamber Database Schema Migration
-- Migration 001: Initial Schema

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- USERS
-- Purpose: Core user accounts
-- Privacy: HIGH - PII data
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      VARCHAR(64) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  display_name  VARCHAR(128) NOT NULL,
  bio           TEXT,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_suspended  BOOLEAN NOT NULL DEFAULT FALSE,
  suspension_reason TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  totp_secret   VARCHAR(64),
  totp_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ,
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
-- Full-text search index for user discovery
CREATE INDEX IF NOT EXISTS idx_users_search ON users
  USING gin(to_tsvector('english', username || ' ' || display_name));

-- ============================================================
-- USER PRIVACY SETTINGS
-- Purpose: Per-user privacy preferences
-- Privacy: MEDIUM
-- ============================================================
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  show_last_seen       BOOLEAN NOT NULL DEFAULT TRUE,
  show_read_receipts   BOOLEAN NOT NULL DEFAULT TRUE,
  allow_dms_from       VARCHAR(16) NOT NULL DEFAULT 'everyone',
  show_online_status   BOOLEAN NOT NULL DEFAULT TRUE,
  profile_visible      BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DEVICES
-- Purpose: Track user devices for multi-device support and key storage
-- Privacy: HIGH
-- ============================================================
CREATE TABLE IF NOT EXISTS devices (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name   VARCHAR(128) NOT NULL,
  device_type   VARCHAR(16) NOT NULL DEFAULT 'web',
  fingerprint   VARCHAR(255),
  public_key    TEXT,
  is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  last_active_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(fingerprint) WHERE fingerprint IS NOT NULL;

-- ============================================================
-- SESSIONS
-- Purpose: Active user sessions (JWT refresh tokens)
-- Privacy: HIGH
-- Retention: 30 days after last activity
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id       UUID REFERENCES devices(id) ON DELETE SET NULL,
  refresh_token   VARCHAR(512) UNIQUE NOT NULL,
  ip_address      INET,
  user_agent      TEXT,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================
-- CONTACTS
-- Purpose: User contact list
-- Privacy: MEDIUM
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname    VARCHAR(128),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);

-- ============================================================
-- BLOCKS
-- Purpose: User blocking
-- Privacy: MEDIUM
-- ============================================================
CREATE TABLE IF NOT EXISTS blocks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);

-- ============================================================
-- CONVERSATIONS
-- Purpose: DM and group conversations
-- Privacy: HIGH
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            VARCHAR(16) NOT NULL DEFAULT 'dm',
  name            VARCHAR(128),
  description     TEXT,
  avatar_url      TEXT,
  is_encrypted    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);

-- ============================================================
-- CONVERSATION MEMBERS
-- Purpose: Members of conversations
-- Privacy: MEDIUM
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            VARCHAR(16) NOT NULL DEFAULT 'member',
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  muted_until     TIMESTAMPTZ,
  last_read_at    TIMESTAMPTZ,
  left_at         TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_members_conv_id ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_user_id ON conversation_members(user_id);

-- ============================================================
-- ATTACHMENTS
-- Purpose: File/media attachments
-- Privacy: HIGH
-- ============================================================
CREATE TABLE IF NOT EXISTS attachments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploader_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name       VARCHAR(255) NOT NULL,
  file_size       BIGINT NOT NULL,
  mime_type       VARCHAR(128) NOT NULL,
  storage_key     TEXT NOT NULL,
  thumbnail_key   TEXT,
  is_encrypted    BOOLEAN NOT NULL DEFAULT FALSE,
  encryption_key  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_attachments_uploader ON attachments(uploader_id);

-- ============================================================
-- MESSAGES
-- Purpose: Chat messages
-- Privacy: VERY HIGH
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                VARCHAR(16) NOT NULL DEFAULT 'text',
  content             TEXT,
  encrypted_content   TEXT,
  attachment_id       UUID REFERENCES attachments(id) ON DELETE SET NULL,
  reply_to_id         UUID REFERENCES messages(id) ON DELETE SET NULL,
  is_encrypted        BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at           TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_search ON messages
  USING gin(to_tsvector('english', COALESCE(content, '')))
  WHERE content IS NOT NULL AND deleted_at IS NULL;

-- ============================================================
-- MESSAGE REACTIONS
-- Privacy: LOW
-- ============================================================
CREATE TABLE IF NOT EXISTS message_reactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji       VARCHAR(16) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id);

-- ============================================================
-- MESSAGE READ RECEIPTS
-- Privacy: MEDIUM - can be disabled by user
-- ============================================================
CREATE TABLE IF NOT EXISTS message_read_receipts (
  message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_read_receipts_message ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_user ON message_read_receipts(user_id);

-- ============================================================
-- CHANNELS
-- Purpose: Broadcast channels
-- Privacy: MEDIUM (public) / HIGH (private)
-- ============================================================
CREATE TABLE IF NOT EXISTS channels (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(128) NOT NULL,
  slug          VARCHAR(128) UNIQUE,
  description   TEXT,
  avatar_url    TEXT,
  visibility    VARCHAR(16) NOT NULL DEFAULT 'public',
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_count  INTEGER NOT NULL DEFAULT 0,
  post_count    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_channels_slug ON channels(slug);
CREATE INDEX IF NOT EXISTS idx_channels_owner ON channels(owner_id);
CREATE INDEX IF NOT EXISTS idx_channels_visibility ON channels(visibility);
CREATE INDEX IF NOT EXISTS idx_channels_search ON channels
  USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- ============================================================
-- CHANNEL MEMBERS
-- Privacy: LOW-MEDIUM
-- ============================================================
CREATE TABLE IF NOT EXISTS channel_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id  UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(16) NOT NULL DEFAULT 'subscriber',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  muted_until TIMESTAMPTZ,
  left_at     TIMESTAMPTZ,
  UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chan_members_chan_id ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_chan_members_user_id ON channel_members(user_id);

-- ============================================================
-- CHANNEL POSTS
-- Privacy: MEDIUM / HIGH
-- ============================================================
CREATE TABLE IF NOT EXISTS channel_posts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id    UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT,
  attachment_id UUID REFERENCES attachments(id) ON DELETE SET NULL,
  edited_at     TIMESTAMPTZ,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_channel ON channel_posts(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON channel_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_search ON channel_posts
  USING gin(to_tsvector('english', COALESCE(content, '')))
  WHERE content IS NOT NULL AND deleted_at IS NULL;

-- ============================================================
-- CHANNEL POST REACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS channel_post_reactions (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id   UUID NOT NULL REFERENCES channel_posts(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji     VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON channel_post_reactions(post_id);

-- ============================================================
-- INVITES
-- Purpose: Invite links for conversations and channels
-- Privacy: MEDIUM
-- ============================================================
CREATE TABLE IF NOT EXISTS invites (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            VARCHAR(64) UNIQUE NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  channel_id      UUID REFERENCES channels(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at      TIMESTAMPTZ,
  max_uses        INTEGER,
  use_count       INTEGER NOT NULL DEFAULT 0,
  status          VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_conv ON invites(conversation_id);
CREATE INDEX IF NOT EXISTS idx_invites_channel ON invites(channel_id);

-- ============================================================
-- REPORTS
-- Privacy: HIGH - sensitive moderation data
-- Retention: 7 years for legal compliance
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_message_id   UUID REFERENCES messages(id) ON DELETE SET NULL,
  reported_channel_id   UUID REFERENCES channels(id) ON DELETE SET NULL,
  reported_post_id      UUID REFERENCES channel_posts(id) ON DELETE SET NULL,
  reason                VARCHAR(64) NOT NULL,
  details               TEXT,
  status                VARCHAR(16) NOT NULL DEFAULT 'pending',
  reviewed_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at           TIMESTAMPTZ,
  action_taken          TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- ============================================================
-- MODERATION ACTIONS
-- Privacy: HIGH - audit log
-- Retention: Permanent
-- ============================================================
CREATE TABLE IF NOT EXISTS moderation_actions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  target_conv_id  UUID REFERENCES conversations(id) ON DELETE SET NULL,
  target_chan_id  UUID REFERENCES channels(id) ON DELETE SET NULL,
  target_msg_id   UUID REFERENCES messages(id) ON DELETE SET NULL,
  action_type     VARCHAR(32) NOT NULL,
  reason          TEXT,
  duration_hours  INTEGER,
  report_id       UUID REFERENCES reports(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mod_actions_actor ON moderation_actions(actor_id);
CREATE INDEX IF NOT EXISTS idx_mod_actions_target_user ON moderation_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_mod_actions_created_at ON moderation_actions(created_at DESC);

-- ============================================================
-- NOTIFICATION SETTINGS
-- Privacy: LOW
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  channel_id      UUID REFERENCES channels(id) ON DELETE CASCADE,
  level           VARCHAR(16) NOT NULL DEFAULT 'all',
  push_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_settings_user ON notification_settings(user_id);

-- ============================================================
-- ENCRYPTION KEY METADATA
-- Privacy: MEDIUM - public key metadata only
-- ============================================================
CREATE TABLE IF NOT EXISTS encryption_keys (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id       UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  key_type        VARCHAR(32) NOT NULL,
  public_key      TEXT NOT NULL,
  key_id          INTEGER,
  signature       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_enc_keys_user ON encryption_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_enc_keys_device ON encryption_keys(device_id);

-- ============================================================
-- RELAY/SERVER NODES (future federation/mesh)
-- Privacy: LOW
-- ============================================================
CREATE TABLE IF NOT EXISTS relay_nodes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id       VARCHAR(128) UNIQUE NOT NULL,
  display_name  VARCHAR(128),
  endpoint_url  TEXT NOT NULL,
  public_key    TEXT,
  capabilities  JSONB DEFAULT '[]',
  region        VARCHAR(64),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  trust_level   VARCHAR(16) NOT NULL DEFAULT 'untrusted',
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relay_nodes_node_id ON relay_nodes(node_id);
CREATE INDEX IF NOT EXISTS idx_relay_nodes_active ON relay_nodes(is_active);

-- ============================================================
-- SCHEMA MIGRATIONS TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(64) PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('001_initial_schema')
  ON CONFLICT (version) DO NOTHING;
