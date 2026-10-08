// Map stops by their itinerary position: copied stops have new identities.
export async function copyItineraryVotes(db: D1Database, sourceId: string, copyId: string): Promise<void> {
  await db.batch([
    db.prepare(`INSERT INTO itinerary_ratings (id, itinerary_id, user_id, rating, created_at)
      SELECT ? || id, ?, user_id, rating, created_at FROM itinerary_ratings WHERE itinerary_id = ?`)
      .bind(`${copyId}-`, copyId, sourceId),
    db.prepare(`INSERT INTO stop_ratings (id, stop_id, user_id, rating, created_at)
      SELECT ? || r.id, destination.id, r.user_id, r.rating, r.created_at
      FROM stop_ratings r JOIN stops source ON source.id = r.stop_id
      JOIN stops destination ON destination.itinerary_id = ? AND destination.position = source.position
      WHERE source.itinerary_id = ?`)
      .bind(`${copyId}-`, copyId, sourceId),
    db.prepare(`INSERT INTO stop_seen (stop_id, user_id, seen, updated_at)
      SELECT destination.id, seen.user_id, seen.seen, seen.updated_at
      FROM stop_seen seen JOIN stops source ON source.id = seen.stop_id
      JOIN stops destination ON destination.itinerary_id = ? AND destination.position = source.position
      WHERE source.itinerary_id = ?`)
      .bind(copyId, sourceId),
  ])
}
