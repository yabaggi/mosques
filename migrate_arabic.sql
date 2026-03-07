-- ═══════════════════════════════════════════════════════
-- Migration: Add Arabic language columns
-- Run: wrangler d1 execute mosquesdb --remote --file=migrate_arabic.sql
-- ═══════════════════════════════════════════════════════

-- mosques: add Arabic columns
ALTER TABLE mosques ADD COLUMN name_ar TEXT;
ALTER TABLE mosques ADD COLUMN description_ar TEXT;
ALTER TABLE mosques ADD COLUMN info_ar TEXT;

-- events: add Arabic columns
ALTER TABLE events ADD COLUMN name_ar TEXT;
ALTER TABLE events ADD COLUMN description_ar TEXT;

-- discuss: add Arabic columns
ALTER TABLE discuss ADD COLUMN author_ar TEXT;
ALTER TABLE discuss ADD COLUMN message_ar TEXT;

