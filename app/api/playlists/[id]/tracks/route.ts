import { NextRequest, NextResponse } from "next/server";
import { db, type PlaylistRow } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { normalizeTrack, spotifyFetch, upsertTrack, type SpotifyTrack } from "@/lib/spotify";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { id } = await ctx.params;
  const playlist = db.prepare("SELECT * FROM playlists WHERE id = ?").get(Number(id)) as
    | PlaylistRow
    | undefined;
  if (!playlist || playlist.owner_id !== user.id) {
    return NextResponse.json({ error: "Playlist introuvable" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const spotifyId = typeof body.spotifyTrackId === "string" ? body.spotifyTrackId : null;
  if (!spotifyId || !/^[A-Za-z0-9]{8,}$/.test(spotifyId)) {
    return NextResponse.json({ error: "Identifiant de morceau invalide" }, { status: 400 });
  }

  try {
    // On revalide le morceau auprès de Spotify (métadonnées fiables + id vérifié).
    const track = normalizeTrack(await spotifyFetch<SpotifyTrack>(user, `/tracks/${spotifyId}`));
    const trackId = upsertTrack(track);

    const exists = db
      .prepare("SELECT 1 FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?")
      .get(playlist.id, trackId);
    if (exists) {
      return NextResponse.json({ error: "Ce morceau est déjà dans la playlist" }, { status: 409 });
    }

    const { next } = db
      .prepare(
        "SELECT COALESCE(MAX(position) + 1, 0) AS next FROM playlist_tracks WHERE playlist_id = ?"
      )
      .get(playlist.id) as { next: number };
    db.prepare(
      "INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)"
    ).run(playlist.id, trackId, next);

    return NextResponse.json({ ok: true, track: { ...track, id: trackId } });
  } catch (e) {
    console.error("Add track failed:", e);
    return NextResponse.json({ error: "Morceau introuvable sur Spotify" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { id } = await ctx.params;
  const playlist = db.prepare("SELECT * FROM playlists WHERE id = ?").get(Number(id)) as
    | PlaylistRow
    | undefined;
  if (!playlist || playlist.owner_id !== user.id) {
    return NextResponse.json({ error: "Playlist introuvable" }, { status: 404 });
  }

  const trackId = Number(req.nextUrl.searchParams.get("trackId"));
  if (!Number.isInteger(trackId)) {
    return NextResponse.json({ error: "trackId manquant" }, { status: 400 });
  }

  const reorder = db.transaction(() => {
    db.prepare("DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?").run(
      playlist.id,
      trackId
    );
    const rows = db
      .prepare(
        "SELECT track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position"
      )
      .all(playlist.id) as { track_id: number }[];
    const update = db.prepare(
      "UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?"
    );
    rows.forEach((r, i) => update.run(i, playlist.id, r.track_id));
  });
  reorder();

  return NextResponse.json({ ok: true });
}
