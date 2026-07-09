-- sprout: app settings, one row per key.
-- Currently used for the homepage countdown deadline
-- (key = 'deadline', value = 'YYYY-MM-DD'). The generic key/value shape lets
-- future site-wide settings live in the same table without a new migration.
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
