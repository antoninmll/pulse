import { NextRequest, NextResponse } from "next/server";
import { db, type PlaylistRow } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { id } = await ctx.params;
  const playlist = db.prepare("SELECT * FROM playlists WHERE id = ?").get(Number(id)) as
    | PlaylistRow
    | undefined;
  if (!playlist || playlist.owner_id !== user.id) {
    return NextResponse.json({ error: "Playlist introuvable" }, { status: 404 });
  }

  const totals = db
    .prepare(
      "SELECT COUNT(*) AS plays, COUNT(DISTINCT user_id) AS listeners FROM plays WHERE playlist_id = ?"
    )
    .get(playlist.id) as { plays: number; listeners: number };

  const perTrack = db
    .prepare(
      `SELECT t.id, t.name, t.artists, t.album_art AS albumArt,
              COUNT(pl.id) AS plays, COUNT(DISTINCT pl.user_id) AS listeners
       FROM playlist_tracks pt
       JOIN tracks t ON t.id = pt.track_id
       LEFT JOIN plays pl ON pl.track_id = pt.track_id AND pl.playlist_id = pt.playlist_id
       WHERE pt.playlist_id = ?
       GROUP BY t.id ORDER BY plays DESC, pt.position`
    )
    .all(playlist.id);

  const perDay = db
    .prepare(
      `SELECT date(played_at, 'unixepoch') AS day, COUNT(*) AS plays
       FROM plays WHERE playlist_id = ? AND played_at >= strftime('%s','now','-13 days','start of day')
       GROUP BY day ORDER BY day`
    )
    .all(playlist.id);

  return NextResponse.json({ totals, perTrack, perDay });
}
