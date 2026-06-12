import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import PlaylistCard, { type PlaylistCardData } from "@/components/PlaylistCard";
import { db, type UserRow } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = db
    .prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE")
    .get(username) as UserRow | undefined;
  if (!user) notFound();

  const playlists = db
    .prepare(
      `SELECT p.share_id AS shareId, p.name, p.description, p.cover_url AS coverUrl,
              (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id) AS trackCount,
              (SELECT COUNT(*) FROM plays pl WHERE pl.playlist_id = p.id) AS playCount
       FROM playlists p WHERE p.owner_id = ? AND p.is_public = 1
       ORDER BY p.created_at DESC`
    )
    .all(user.id) as PlaylistCardData[];

  return (
    <div>
      <div className="card flex items-center gap-5 p-6">
        <Avatar src={user.avatar_url} name={user.username ?? "?"} size={80} />
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {user.display_name || `@${user.username}`}
          </h1>
          <p className="text-sm text-gold">@{user.username}</p>
          {user.bio && <p className="mt-1.5 text-sm text-muted">{user.bio}</p>}
        </div>
      </div>

      <h2 className="font-display mt-8 text-xl font-semibold">
        Playlists publiques ({playlists.length})
      </h2>
      {playlists.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Aucune playlist publique pour le moment.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {playlists.map((p) => (
            <PlaylistCard key={p.shareId} playlist={p} />
          ))}
        </div>
      )}
    </div>
  );
}
