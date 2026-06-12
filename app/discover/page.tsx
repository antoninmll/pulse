import DiscoverClient from "@/components/DiscoverClient";
import { type PlaylistCardData } from "@/components/PlaylistCard";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const user = await getCurrentUser();
  const playlists = db
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
       FROM playlists p
       JOIN users u ON u.id = p.owner_id
       WHERE p.is_public = 1
       ORDER BY playCount DESC, p.created_at DESC
       LIMIT 60`
    )
    .all() as PlaylistCardData[];

  return (
    <div>
      <p className="eyebrow">Exploration</p>
      <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
        Découvrir <span className="gold-text">la communauté</span>
      </h1>
      <p className="mt-2 text-sm text-muted">
        Cherche une playlist, un utilisateur ou une musique — ou explore les playlists
        publiques classées par popularité.
      </p>

      <DiscoverClient initialPlaylists={playlists} isLoggedIn={Boolean(user)} />
    </div>
  );
}
