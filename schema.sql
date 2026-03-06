-- ═══════════════════════════════════════════════════════
-- Masjid Community App — D1 Database Schema
-- Run with: wrangler d1 execute mosquesdb --file=schema.sql
-- Or for remote: wrangler d1 execute mosquesdb --remote --file=schema.sql
-- ═══════════════════════════════════════════════════════

-- ─── Mosques (master table) ───────────────────────────
CREATE TABLE IF NOT EXISTS mosques (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  description      TEXT,
  info             TEXT,
  date_constructed TEXT,           -- year or date string, e.g. "1984" or "632 CE"
  latitude         REAL,
  longitude        REAL,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── Events (linked to mosque) ────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  mosque_id   INTEGER NOT NULL REFERENCES mosques(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  description TEXT,
  date        TEXT,               -- ISO 8601 recommended: "2025-03-15T19:00:00Z"
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_mosque ON events(mosque_id);
CREATE INDEX IF NOT EXISTS idx_events_date   ON events(date);

-- ─── Images (linked to mosque, stores BLOB) ───────────
-- D1 hard limit is 1 MiB per row; client-side Canvas compressor
-- must ensure blobs stay under 0.8 MiB before upload.
CREATE TABLE IF NOT EXISTS imgs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  mosque_id  INTEGER NOT NULL REFERENCES mosques(id) ON DELETE CASCADE,
  img        BLOB    NOT NULL,    -- JPEG binary, max ~0.8 MiB
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_imgs_mosque ON imgs(mosque_id);

-- ─── Discuss (global community feed) ─────────────────
-- NOT linked to a mosque — community-wide board.
CREATE TABLE IF NOT EXISTS discuss (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  author     TEXT    NOT NULL DEFAULT 'Anonymous',
  message    TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_discuss_created ON discuss(created_at DESC);

-- ═══════════════════════════════════════════════════════
-- SEED DATA (optional — uncomment to populate)
-- ═══════════════════════════════════════════════════════

INSERT OR IGNORE INTO mosques (id, name, description, info, date_constructed, latitude, longitude) VALUES
(1, 'Al-Masjid al-Haram', 'The Grand Mosque in Mecca, the largest mosque in the world.', 'Surrounds the Masjid al-Haram, the holiest site in Islam. Capacity exceeds 2 million worshippers during Hajj.', '570 CE', 21.4225, 39.8262),
(2, 'Al-Masjid an-Nabawi', 'The Prophet''s Mosque in Medina, the second holiest mosque in Islam.', 'Built by the Prophet Muhammad (PBUH) in 622 CE after his migration to Medina. Houses the tomb of the Prophet.', '622 CE', 24.4672, 39.6112),
(3, 'Masjid al-Aqsa', 'The Al-Aqsa Mosque in Jerusalem, the third holiest site in Islam.', 'Located in the Old City of Jerusalem. Its silver dome is a landmark of the Jerusalem skyline.', '705 CE', 31.7781, 35.2354),
(4, 'Sultan Ahmed Mosque', 'The Blue Mosque of Istanbul, known for its stunning blue İznik tiles.', 'Built between 1609 and 1616 during the rule of Ahmed I. Features six minarets and a cascade of domes.', '1616', 41.0054, 28.9768),
(5, 'Sheikh Zayed Grand Mosque', 'One of the largest mosques in the world, located in Abu Dhabi, UAE.', 'Features 82 domes, over 1,000 columns, 24-carat gold gilded chandeliers, and one of the world''s largest carpets.', '2007', 24.4128, 54.4750);

INSERT OR IGNORE INTO events (mosque_id, name, description, date) VALUES
(1, 'Hajj Season 2025', 'Annual Hajj pilgrimage season', '2025-06-05T00:00:00Z'),
(4, 'Ramadan Night Prayer', 'Special Tarawih prayers during Ramadan', '2025-03-01T20:00:00Z'),
(5, 'Islamic Art Exhibition', 'Showcasing calligraphy and Islamic geometric art', '2025-04-15T10:00:00Z');

INSERT OR IGNORE INTO discuss (author, message) VALUES
('Admin', 'Welcome to the Masjid Community Hub! Share knowledge, ask questions, and connect with Muslims worldwide. 🕌'),
('Abdullah', 'JazakAllahu Khairan for this wonderful platform. May Allah bless everyone here.'),
('Fatima', 'Does anyone know the Fajr prayer time in London this week? Planning a visit to the local mosque.'),
('Ibrahim', 'The Sheikh Zayed Grand Mosque is absolutely breathtaking. Visited last month for Umrah.');

