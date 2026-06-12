// Données de démo pour vérifier l'interface sans compte Spotify.
// Usage : node scripts/seed-test.mjs  → affiche un cookie de session de test.
import Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const secret = env.match(/SESSION_SECRET=(.+)/)?.[1].trim() ?? "dev-secret-change-me";

const dataDir = new URL("../data/", import.meta.url).pathname.replace(/^\//, "");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(dataDir + "pulse.db");

// Même schéma que lib/db.ts — permet de lancer le seed avant le premier démarrage de l'app.
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spotify_id TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT NOT NULL DEFAULT '',
  spotify_product TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  share_id TEXT NOT NULL UNIQUE,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_url TEXT,
  is_public INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spotify_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  artists TEXT NOT NULL,
  album TEXT,
  album_art TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  PRIMARY KEY (playlist_id, track_id)
);
CREATE TABLE IF NOT EXISTS plays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  played_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
`);

db.prepare(
  `INSERT OR IGNORE INTO users (spotify_id, username, display_name, bio, spotify_product, token_expires_at)
   VALUES ('test_spotify_id', 'neo_tester', 'Neo', 'Explorateur sonore.', 'premium', 0)`
).run();
const user = db.prepare("SELECT id FROM users WHERE spotify_id = 'test_spotify_id'").get();

const existing = db.prepare("SELECT id FROM playlists WHERE owner_id = ?").get(user.id);
if (!existing) {
  const p = db
    .prepare(
      `INSERT INTO playlists (share_id, owner_id, name, description, is_public)
       VALUES ('demoShare01', ?, 'Voyage Synthwave', 'Du néon plein les oreilles — sélection rétro-futuriste.', 1)`
    )
    .run(user.id);
  const playlistId = Number(p.lastInsertRowid);

  const tracks = [
    ["7x123abc0001", "Nightcall", "Kavinsky", "OutRun", 258000],
    ["7x123abc0002", "Midnight City", "M83", "Hurry Up, We're Dreaming", 244000],
    ["7x123abc0003", "Genesis", "Justice", "Cross", 234000],
    ["7x123abc0004", "Innerbloom", "RÜFÜS DU SOL", "Bloom", 577000],
    ["7x123abc0005", "Tearing Me Up", "Bob Moses", "Days Gone By", 332000],
  ];
  const insTrack = db.prepare(
    "INSERT OR IGNORE INTO tracks (spotify_id, name, artists, album, duration_ms) VALUES (?, ?, ?, ?, ?)"
  );
  const insPt = db.prepare(
    "INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)"
  );
  const insPlay = db.prepare(
    "INSERT INTO plays (playlist_id, track_id, user_id, played_at) VALUES (?, ?, ?, ?)"
  );
  tracks.forEach((t, i) => {
    insTrack.run(...t);
    const trackId = db.prepare("SELECT id FROM tracks WHERE spotify_id = ?").get(t[0]).id;
    insPt.run(playlistId, trackId, i);
    // écoutes réparties sur les 10 derniers jours
    const now = Math.floor(Date.now() / 1000);
    for (let j = 0; j < (5 - i) * 3; j++) {
      insPlay.run(playlistId, trackId, user.id, now - Math.floor(Math.random() * 10) * 86400);
    }
  });
}

const payload = Buffer.from(
  JSON.stringify({ uid: user.id, exp: Math.floor(Date.now() / 1000) + 86400 })
).toString("base64url");
const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
console.log(`pulse_session=${payload}.${sig}`);
