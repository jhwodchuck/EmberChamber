-- Web Push (VAPID) subscriptions for browser-based push notifications.
-- One subscription per device; endpoint + keys come from the browser PushManager API.
-- The endpoint and keys are stored in plaintext — they are public by design
-- (endpoint URLs are given to the push service; p256dh/auth are the RECIPIENT keys
-- used for payload encryption). No message content is stored here.
CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  device_id TEXT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_push_attempt_at TEXT,
  last_push_success_at TEXT,
  last_push_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_account_id
  ON web_push_subscriptions(account_id);
