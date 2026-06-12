import { db, type TrackRow, type UserRow } from "./db";

const ACCOUNTS = "https://accounts.spotify.com";
export const SPOTIFY_API = "https://api.spotify.com/v1";

export const SCOPES = [
  "user-read-email",
  "user-read-private",
  "streaming",
  "user-read-playback-state",
  "user-modify-playback-state",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

export function appUrl(): string {
  return (process.env.APP_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
}

export function redirectUri(): string {
  return `${appUrl()}/api/auth/callback`;
}

export function isConfigured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: SCOPES,
    state,
    show_dialog: "false",
  });
  return `${ACCOUNTS}/authorize?${params}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const auth = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch(`${ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Spotify token error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export function exchangeCode(code: string): Promise<TokenResponse> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
    })
  );
}

export function refreshToken(refresh: string): Promise<TokenResponse> {
  return tokenRequest(new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }));
}

/** Renvoie un access token valide pour cet utilisateur, en le rafraîchissant si besoin. */
export async function getValidAccessToken(user: UserRow): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (user.access_token && user.token_expires_at > now + 60) {
    return user.access_token;
  }
  if (!user.refresh_token) throw new Error("NO_REFRESH_TOKEN");
  const t = await refreshToken(user.refresh_token);
  const expiresAt = now + t.expires_in;
  db.prepare(
    "UPDATE users SET access_token = ?, refresh_token = COALESCE(?, refresh_token), token_expires_at = ? WHERE id = ?"
  ).run(t.access_token, t.refresh_token ?? null, expiresAt, user.id);
  return t.access_token;
}

export class SpotifyApiError extends Error {
  status: number;
  constructor(status: number, body: string) {
    super(`Spotify API ${status}: ${body}`);
    this.status = status;
  }
}

/** Appel à l'API Spotify avec le compte de l'utilisateur. */
export async function spotifyFetch<T>(user: UserRow, pathname: string): Promise<T> {
  const token = await getValidAccessToken(user);
  const res = await fetch(`${SPOTIFY_API}${pathname}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new SpotifyApiError(res.status, await res.text());
  }
  return res.json();
}

/** Extrait un id de morceau ou de playlist depuis un lien/URI/id Spotify. */
export function parseSpotifyLink(
  input: string
): { type: "track" | "playlist"; id: string } | null {
  const s = input.trim();
  const url = s.match(
    /open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|playlist)\/([A-Za-z0-9]{8,})/i
  );
  if (url) return { type: url[1].toLowerCase() as "track" | "playlist", id: url[2] };
  const uri = s.match(/spotify:(track|playlist):([A-Za-z0-9]{8,})/i);
  if (uri) return { type: uri[1].toLowerCase() as "track" | "playlist", id: uri[2] };
  return null;
}

export type SpotifyTrack = {
  id: string;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album?: { name?: string; images?: { url: string; width?: number }[] };
};

export type NormalizedTrack = {
  spotifyId: string;
  name: string;
  artists: string;
  album: string;
  albumArt: string | null;
  durationMs: number;
};

export function normalizeTrack(t: SpotifyTrack): NormalizedTrack {
  const images = t.album?.images ?? [];
  // image moyenne de préférence (300px), sinon la première
  const art = images.find((i) => i.width === 300)?.url ?? images[0]?.url ?? null;
  return {
    spotifyId: t.id,
    name: t.name,
    artists: t.artists.map((a) => a.name).join(", "),
    album: t.album?.name ?? "",
    albumArt: art,
    durationMs: t.duration_ms,
  };
}

/** Insère ou met à jour un morceau, renvoie son id local. */
export function upsertTrack(t: NormalizedTrack): number {
  db.prepare(
    `INSERT INTO tracks (spotify_id, name, artists, album, album_art, duration_ms)
     VALUES (@spotifyId, @name, @artists, @album, @albumArt, @durationMs)
     ON CONFLICT(spotify_id) DO UPDATE SET
       name = excluded.name, artists = excluded.artists, album = excluded.album,
       album_art = excluded.album_art, duration_ms = excluded.duration_ms`
  ).run(t);
  const row = db.prepare("SELECT id FROM tracks WHERE spotify_id = ?").get(t.spotifyId) as {
    id: number;
  };
  return row.id;
}

export function trackRowToJson(t: TrackRow) {
  return {
    id: t.id,
    spotifyId: t.spotify_id,
    name: t.name,
    artists: t.artists,
    album: t.album,
    albumArt: t.album_art,
    durationMs: t.duration_ms,
  };
}
