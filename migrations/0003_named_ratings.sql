ALTER TABLE itinerary_ratings ADD COLUMN user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE stop_ratings ADD COLUMN user_id TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX idx_itinerary_ratings_user
  ON itinerary_ratings(itinerary_id, user_id)
  WHERE user_id <> '';

CREATE UNIQUE INDEX idx_stop_ratings_user
  ON stop_ratings(stop_id, user_id)
  WHERE user_id <> '';
