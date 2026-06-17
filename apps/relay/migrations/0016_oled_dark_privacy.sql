-- Phase 3 (Stable Beta): persist the OLED-dark privacy preference server-side so
-- it syncs across devices instead of living only in web localStorage.
ALTER TABLE accounts ADD COLUMN oled_dark INTEGER NOT NULL DEFAULT 0;
