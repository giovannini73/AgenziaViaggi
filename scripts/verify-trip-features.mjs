import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { build } from 'esbuild'

const bundled = await build({
  stdin: { contents: `export { stops } from './worker/routes/stops'; export { itineraries } from './worker/routes/itineraries'; export { rome2rioUrl, reconcileTransfers } from './shared/transfers';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
})
const { stops, itineraries, rome2rioUrl, reconcileTransfers } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`)
const sqlite = new DatabaseSync(':memory:')
for (const file of readdirSync('migrations').sort()) sqlite.exec(readFileSync(`migrations/${file}`, 'utf8'))
const db = {
  prepare(sql) {
    let values = []
    const statement = {
      bind(...args) { values = args; return statement },
      async first() { return sqlite.prepare(sql).get(...values) || null },
      async all() { return { results: sqlite.prepare(sql).all(...values) } },
      async run() { return sqlite.prepare(sql).run(...values) },
    }
    return statement
  },
  async batch(statements) {
    sqlite.exec('BEGIN')
    try { const result = []; for (const statement of statements) result.push(await statement.run()); sqlite.exec('COMMIT'); return result }
    catch (err) { sqlite.exec('ROLLBACK'); throw err }
  },
}
sqlite.exec(`
  INSERT INTO itineraries (id,title,slug,start_date,created_at,updated_at) VALUES ('original','Viaggio','viaggio','2026-10-24','now','now');
  INSERT INTO stops (id,itinerary_id,position,name,nights,created_at,updated_at) VALUES ('a','original',1,'Roma',1,'now','now'),('b','original',2,'Firenze',2,'now','now');
  INSERT INTO itinerary_ratings (id,itinerary_id,user_id,rating,created_at) VALUES ('ir','original','claudio',0,'now');
  INSERT INTO stop_ratings (id,stop_id,user_id,rating,created_at) VALUES ('ra','a','sabrina',5,'now'),('rb','b','claudio',3,'now');
  INSERT INTO stop_seen (stop_id,user_id,seen,updated_at) VALUES ('a','sabrina',1,'now'),('b','claudio',0,'now');
`)
const env = { DB: db }
const request = (app, url, method, body) => app.request(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, env)
let response = await request(itineraries, '/original/duplicate', 'POST', {})
assert.equal(response.status, 201)
const copy = await response.json()
assert.notEqual(copy.id, 'original')
assert.equal(copy.votes.find((vote) => vote.user_id === 'claudio').rating, 0)
assert.equal(copy.stops[0].votes.find((vote) => vote.user_id === 'sabrina').rating, 5)
assert.equal(copy.stops[0].votes.find((vote) => vote.user_id === 'sabrina').seen, true)
assert.equal(copy.stops[1].votes.find((vote) => vote.user_id === 'claudio').rating, 3)
assert.equal(copy.stops[1].votes.find((vote) => vote.user_id === 'claudio').seen, false)
assert.equal(sqlite.prepare('SELECT seen FROM stop_seen WHERE stop_id = ? AND user_id = ?').get(copy.stops[1].id, 'claudio').seen, 0)
for (const nights of [0, -1, 31, 1.5, '2']) {
  assert.equal((await request(stops, '/a/nights', 'PUT', { nights })).status, 400)
}
response = await request(stops, '/a/nights', 'PUT', { nights: 2 })
assert.equal(response.status, 200)
const updated = await response.json()
assert.equal(updated.end_date, '2026-10-28')
assert.equal(updated.duration_days, 5)
assert.equal(sqlite.prepare('SELECT end_date FROM itineraries WHERE id = ?').get('original').end_date, '2026-10-28')
assert.equal(updated.stops[0].votes.find((vote) => vote.user_id === 'sabrina').rating, 5)
response = await request(stops, '/b/transfer', 'PUT', { transfer_minutes: 95, transfer_distance_km: 270.1, transfer_mode: 'Treno' })
assert.equal(response.status, 200)
const transfer = await response.json()
assert.equal(transfer.transfer_minutes, 95)
assert.equal(transfer.nights, 2)
assert.equal(transfer.name, 'Firenze')
assert.equal(transfer.votes.find((vote) => vote.user_id === 'claudio').rating, 3)
assert.equal((await request(stops, '/b/transfer', 'PUT', { transfer_minutes: -1 })).status, 400)
assert.equal((await request(stops, '/a/move', 'PUT', { direction: -1 })).status, 400)
assert.equal((await request(stops, '/b/move', 'PUT', { direction: 0 })).status, 400)
response = await request(stops, '/b/move', 'PUT', { direction: -1 })
assert.equal(response.status, 200)
const moved = await response.json()
assert.deepEqual(moved.stops.map((stop) => stop.id), ['b', 'a'])
assert.deepEqual(moved.stops.map((stop) => stop.position), [1, 2])
assert.equal(moved.stops[0].transfer_distance_km, null)
assert.equal(moved.stops[0].transfer_minutes, null)
assert.equal(moved.stops[1].votes.find((vote) => vote.user_id === 'sabrina').rating, 5)
assert.equal(moved.stops[1].votes.find((vote) => vote.user_id === 'sabrina').seen, true)
assert.equal(moved.end_date, '2026-10-28')
response = await request(stops, '/b/move', 'PUT', { direction: 1 })
assert.equal(response.status, 200)
assert.deepEqual((await response.json()).stops.map((stop) => stop.id), ['a', 'b'])
const url = new URL(rome2rioUrl({ name: 'Roma', country: 'Italia' }, { name: 'Firenze', country: 'Italia' }))
assert.equal(url.hostname, 'www.rome2rio.com')
assert.equal(decodeURIComponent(url.pathname), '/s/Roma, Italia/Firenze, Italia')
const before = [{ key: 'a', name: 'Roma' }, { key: 'b', name: 'Firenze', transfer_minutes: 95 }, { key: 'c', name: 'Milano', transfer_minutes: 120 }]
const reordered = reconcileTransfers(before, [before[0], before[2], before[1]])
assert.equal(reordered[1].transfer_minutes, null)
assert.equal(reordered[2].transfer_minutes, null)
assert.equal(reconcileTransfers(before, before)[1].transfer_minutes, 95)
console.log('Verificati: copia voti e visto/da vedere, notti 1–30, arrivo, salvataggio trasferimenti, link Rome2Rio e riordino tappe.')
sqlite.close()
