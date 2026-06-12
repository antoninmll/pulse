import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { normalizeTrack, spotifyFetch, type SpotifyTrack } from "@/lib/spotify";

/** Recherche dans Découvrir : playlists publiques, utilisateurs ou catalogue Spotify. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const type = req.nextUrl.searchParams.get("type") ?? "playlists";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const like = `%${q.replace(/[%_]/g, "")}%`;

  if (type === "playlists") {
    const results = db
      .prepare(
        `SELECT p.share_id AS shareId, p.name, p.description, p.cover_url AS coverUrl,
                u.username AS ownerName,
                (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id) AS trackCount,
                (SELECT COUNT(*) FROM plays pl WHERE pl.playlist_id = p.id) AS playCount,
                (SELECT json_group_array(album_art) FROM (
                   SELECT t.album_art FROM playlist_tracks pt
                   JOIN tracks t ON t.id = pt.track_id
                   WHERE pt.playlist_id = p.id AND t.album_art IS NOT NULL
                   ORDER BY pt.position LIMIT 12
                 )) AS artsJson
         FROM playlists p JOIN users u ON u.id = p.owner_id
         WHERE p.is_public = 1 AND (p.name LIKE ? OR p.description LIKE ?)
         ORDER BY playCount DESC, p.created_at DESC LIMIT 30`
      )
      .all(like, like);
    return NextResponse.json({ results });
  }

  if (type === "users") {
    const results = db
      .prepare(
        `SELECT u.username, u.display_name AS displayName, u.avatar_url AS avatarUrl, u.bio,
                (SELECT COUNT(*) FROM playlists p WHERE p.owner_id = u.id AND p.is_public = 1) AS playlistCount
         FROM users u
         WHERE u.username IS NOT NULL AND (u.username LIKE ? OR u.display_name LIKE ?)
         ORDER BY playlistCount DESC LIMIT 30`
      )
      .all(like, like);
    return NextResponse.json({ results });
  }

  if (type === "tracks") {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Connecte-toi pour rechercher des musiques" },
        { status: 401 }
      );
    }
    try {
      // Les apps Spotify en mode développement plafonnent la recherche à limit=10
      const data = await spotifyFetch<{ tracks: { items: SpotifyTrack[] } }>(
        user,
        `/search?type=track&limit=10&q=${encodeURIComponent(q)}`
      );
      return NextResponse.json({ results: data.tracks.items.map(normalizeTrack) });
    } catch (e) {
      console.error("Discover track search failed:", e);
      return NextResponse.json({ error: "La recherche Spotify a échoué" }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Type inconnu" }, { status: 400 });
}
