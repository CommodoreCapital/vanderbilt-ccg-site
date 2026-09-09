-- Commodore Capital Group — analytics schema (Cloudflare D1)
-- Apply with:  npx wrangler d1 execute ccg-analytics --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS events (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ts       TEXT NOT NULL,   -- ISO-8601 UTC timestamp
  day      TEXT NOT NULL,   -- YYYY-MM-DD in America/Chicago (Nashville time)
  type     TEXT NOT NULL,   -- 'view' | 'apply' | 'report'
  page     TEXT,            -- path the event happened on
  label    TEXT,            -- which button, or which report file
  ref      TEXT,            -- referring site host, 'direct', or 'internal'
  device   TEXT,            -- 'mobile' | 'desktop'
  country  TEXT,            -- 2-letter country code from Cloudflare
  session  TEXT             -- random per-tab id; cleared when the tab closes
);

CREATE INDEX IF NOT EXISTS idx_events_day     ON events (day);
CREATE INDEX IF NOT EXISTS idx_events_type    ON events (type, day);
CREATE INDEX IF NOT EXISTS idx_events_session ON events (session);
