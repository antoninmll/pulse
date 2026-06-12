import PlaylistCard, { type PlaylistCardData } from "@/components/PlaylistCard";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const playlists = db
    .prepare(
      `SELECT p.share_id AS shareId, p.name, p.description, p.cover_url AS coverUrl,
              u.username AS ownerName,
              (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id) AS trackCount,
              (SELECT COUNT(*) FROM plays pl WHERE pl.playlist_id = p.id) AS playCount
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
        Découvrir les <span className="gold-text">playlists</span>
      </h1>
      <p className="mt-2 text-sm text-muted">
        Les playlists publiques de la communauté, classées par popularité.
      </p>

      {playlists.length === 0 ? (
        <div className="card mt-10 px-6 py-16 text-center text-muted">
          Aucune playlist publique pour l&apos;instant — sois la première personne à en partager
          une !
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {playlists.map((p) => (
            <PlaylistCard key={p.shareId} playlist={p} />
          ))}
        </div>
      )}
    </div>
  );
}
