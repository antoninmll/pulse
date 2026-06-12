import Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const SCHEMA = `
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

CREATE INDEX IF NOT EXISTS idx_plays_playlist ON plays(playlist_id);
CREATE INDEX IF NOT EXISTS idx_plays_user ON plays(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id, position);
`;

function createDb(): Database.Database {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "pulse.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  // Migrations additives sur les bases existantes
  const userCols = (db.pragma("table_info(users)") as { name: string }[]).map((c) => c.name);
  if (!userCols.includes("settings")) {
    db.exec("ALTER TABLE users ADD COLUMN settings TEXT NOT NULL DEFAULT '{}'");
  }
  return db;
}

// En dev, le hot-reload recharge les modules : on garde une seule connexion.
const globalForDb = globalThis as unknown as { _pulseDb?: Database.Database };
export const db = globalForDb._pulseDb ?? (globalForDb._pulseDb = createDb());

export type UserRow = {
  id: number;
  spotify_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string;
  spotify_product: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: number;
  created_at: number;
  settings: string;
};

/** Préférences utilisateur persistées (JSON dans users.settings). */
export type UserSettings = {
  /** Visualiseur audio dans la barre de lecture */
  visualizer: boolean;
  /** Volume du lecteur (0 à 1), synchronisé entre appareils */
  volume: number;
};

export const DEFAULT_SETTINGS: UserSettings = { visualizer: true, volume: 0.7 };

export function parseSettings(raw: string | null | undefined): UserSettings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw || "{}") };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export type PlaylistRow = {
  id: number;
  share_id: string;
  owner_id: number;
  name: string;
  description: string;
  cover_url: string | null;
  is_public: number;
  created_at: number;
};

export type TrackRow = {
  id: number;
  spotify_id: string;
  name: string;
  artists: string;
  album: string | null;
  album_art: string | null;
  duration_ms: number;
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function newShareId(length = 10): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function publicUser(u: UserRow) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    avatarUrl: u.avatar_url,
    bio: u.bio,
  };
}
