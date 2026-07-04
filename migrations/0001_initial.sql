-- sprout: daily journal entries, one row per day.
-- `date` is the natural primary key, stored as 'YYYY-MM-DD' in the user's
-- local timezone (APP_TIMEZONE). Past days are immutable; only today's row
-- may be upserted.
CREATE TABLE IF NOT EXISTS entries (
  date       TEXT PRIMARY KEY,
  content    TEXT NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
