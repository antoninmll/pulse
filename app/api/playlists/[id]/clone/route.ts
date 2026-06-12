import { NextRequest, NextResponse } from "next/server";
import { db, newShareId, type PlaylistRow } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { id } = await ctx.params;
  const playlistId = Number(id);

  const playlist = db.prepare("SELECT * FROM playlists WHERE id = ?").get(playlistId) as
    | PlaylistRow
    | undefined;

  if (!playlist) {
    return NextResponse.json({ error: "Playlist introuvable" }, { status: 404 });
  }

  // Si la playlist est privée et que l'utilisateur n'est pas le propriétaire
  if (!playlist.is_public && playlist.owner_id !== user.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const shareId = newShareId();
  const name = playlist.name.startsWith("Copie de ") ? playlist.name : `Copie de ${playlist.name}`;

  try {
    const cloneTx = db.transaction(() => {
      // 1. Créer la nouvelle playlist
      const result = db.prepare(
        "INSERT INTO playlists (share_id, owner_id, name, description, cover_url, is_public) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(shareId, user.id, name, playlist.description, playlist.cover_url, 0); // La copie est privée par défaut

      const newPlaylistId = result.lastInsertRowid as number;

      // 2. Récupérer et copier les morceaux
      const tracks = db.prepare(
        "SELECT track_id, position FROM playlist_tracks WHERE playlist_id = ? ORDER BY position"
      ).all(playlist.id) as { track_id: number; position: number }[];

      const insertTrack = db.prepare(
        "INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)"
      );

      for (const t of tracks) {
        insertTrack.run(newPlaylistId, t.track_id, t.position);
      }
    });

    cloneTx();

    return NextResponse.json({ ok: true, shareId });
  } catch (e) {
    console.error("Clone failed:", e);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
