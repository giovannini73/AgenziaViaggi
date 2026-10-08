CREATE TABLE itineraries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  start_city TEXT NOT NULL DEFAULT '',
  end_city TEXT NOT NULL DEFAULT '',
  start_date TEXT,
  end_date TEXT,
  travel_style TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  recommended_period TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE stops (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  latitude REAL,
  longitude REAL,
  arrival_day TEXT NOT NULL DEFAULT '',
  nights INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  why_visit TEXT NOT NULL DEFAULT '',
  attractions TEXT NOT NULL DEFAULT '',
  food_notes TEXT NOT NULL DEFAULT '',
  markets TEXT NOT NULL DEFAULT '',
  where_to_eat TEXT NOT NULL DEFAULT '',
  where_to_stay TEXT NOT NULL DEFAULT '',
  beaches TEXT NOT NULL DEFAULT '',
  excursions TEXT NOT NULL DEFAULT '',
  transfer_minutes INTEGER,
  transfer_distance_km REAL,
  transfer_mode TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id)
);

CREATE INDEX idx_stops_itinerary ON stops(itinerary_id, position);

CREATE TABLE itinerary_ratings (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id)
);

CREATE TABLE itinerary_comments (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL,
  rating INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id)
);

CREATE INDEX idx_itinerary_comments ON itinerary_comments(itinerary_id, created_at);

CREATE TABLE stop_ratings (
  id TEXT PRIMARY KEY,
  stop_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (stop_id) REFERENCES stops(id)
);

CREATE TABLE stop_comments (
  id TEXT PRIMARY KEY,
  stop_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL,
  rating INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (stop_id) REFERENCES stops(id)
);

CREATE INDEX idx_stop_comments ON stop_comments(stop_id, created_at);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE TABLE itinerary_revisions (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id)
);

CREATE INDEX idx_revisions ON itinerary_revisions(itinerary_id, created_at);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
