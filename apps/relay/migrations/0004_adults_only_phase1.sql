ALTER TABLE accounts ADD COLUMN age_confirmed_18_at TEXT;
ALTER TABLE auth_challenges ADD COLUMN age_confirmed_18 INTEGER NOT NULL DEFAULT 0;
