DROP TABLE IF EXISTS mosques;
CREATE TABLE mosques (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  info TEXT,
  date_constructed TEXT,
  latitude REAL,
  longitude REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS events;
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mosque_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mosque_id) REFERENCES mosques(id)
);

DROP TABLE IF EXISTS discussions;
CREATE TABLE discussions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mosque_id INTEGER NOT NULL,
  author TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mosque_id) REFERENCES mosques(id)
);
