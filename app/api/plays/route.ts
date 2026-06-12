import { NextRequest, NextResponse } from "next/server";
import { db, type PlaylistRow } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const playlistId = Number(body.playlistId);
  const spotifyTrackId = typeof body.spotifyTrackId === "string" ? body.spotifyTrackId : "";
  if (!Number.isInteger(playlistId) || !spotifyTrackId) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const playlist = db.prepare("SELECT * FROM playlists WHERE id = ?").get(playlistId) as
    | PlaylistRow
    | undefined;
  if (!playlist) return NextResponse.json({ error: "Playlist introuvable" }, { status: 404 });

  const track = db
    .prepare(
      `SELECT t.id FROM tracks t
       JOIN playlist_tracks pt ON pt.track_id = t.id AND pt.playlist_id = ?
       WHERE t.spotify_id = ?`
    )
    .get(playlistId, spotifyTrackId) as { id: number } | undefined;
  if (!track) {
    return NextResponse.json({ error: "Morceau absent de la playlist" }, { status: 404 });
  }

  // Anti-doublon : on ignore une écoute identique enregistrée il y a moins de 30 s.
  const recent = db
    .prepare(
      `SELECT 1 FROM plays WHERE playlist_id = ? AND track_id = ? AND user_id = ?
       AND played_at >= strftime('%s','now') - 30`
    )
    .get(playlistId, track.id, user.id);
  if (!recent) {
    db.prepare("INSERT INTO plays (playlist_id, track_id, user_id) VALUES (?, ?, ?)").run(
      playlistId,
      track.id,
      user.id
    );
  }
  return NextResponse.json({ ok: true });
}
