CREATE TABLE stop_notes (
  id TEXT PRIMARY KEY,
  stop_id TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  video_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (stop_id) REFERENCES stops(id)
);
CREATE INDEX idx_stop_notes_stop ON stop_notes(stop_id, created_at);
