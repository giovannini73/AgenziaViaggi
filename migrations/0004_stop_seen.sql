CREATE TABLE stop_seen (
  stop_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  seen INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (stop_id, user_id),
  FOREIGN KEY (stop_id) REFERENCES stops(id)
);
