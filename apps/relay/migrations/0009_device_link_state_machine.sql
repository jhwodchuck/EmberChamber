ALTER TABLE device_links ADD COLUMN qr_mode TEXT NOT NULL DEFAULT 'source_display';
ALTER TABLE device_links ADD COLUMN claimed_at TEXT;
ALTER TABLE device_links ADD COLUMN consumed_at TEXT;
ALTER TABLE device_links ADD COLUMN completed_device_id TEXT;
ALTER TABLE device_links ADD COLUMN completed_session_id TEXT;

UPDATE device_links
   SET qr_mode = 'source_display'
 WHERE qr_mode IS NULL;

CREATE INDEX IF NOT EXISTS idx_device_links_consumed_at
  ON device_links(consumed_at);
